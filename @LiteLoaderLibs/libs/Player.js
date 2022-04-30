import { DirectionAngle } from '../utils/DirectionAngle.js';
import { IntPos } from './IntPos.js';
import { FloatPos } from './FloatPos.js';
import { Device } from './Device.js';
import { InetSocketAddress } from 'java.net.InetSocketAddress';
import { Collectors } from 'java.util.stream.Collectors';
import { Server } from 'cn.nukkit.Server';
import { PlayerChatEvent } from 'cn.nukkit.event.player.PlayerChatEvent';
import { Position } from 'cn.nukkit.level.Position';
import { Vector3 } from 'cn.nukkit.math.Vector3';
import { EntityDamageByEntityEvent } from 'cn.nukkit.event.entity.EntityDamageByEntityEvent';
import { EntityDamageEvent } from 'cn.nukkit.event.entity.EntityDamageEvent';
import { EnumLevel } from 'cn.nukkit.level.EnumLevel';
import { Player as JPlayer } from 'cn.nukkit.Player';
import { Attribute } from 'cn.nukkit.entity.Attribute';
import { BossBarColor } from 'cn.nukkit.utils.BossBarColor';
import { DummyBossBar } from 'cn.nukkit.utils.DummyBossBar';
import { AdventureSettings } from 'cn.nukkit.AdventureSettings';
import { Scoreboard } from 'cn.nukkit.scoreboard.Scoreboard';
import { ScoreboardManager } from 'cn.nukkit.scoreboard.ScoreboardManager';
import { DisplaySlot } from 'cn.nukkit.scoreboard.data.DisplaySlot';
import { SortOrder } from 'cn.nukkit.scoreboard.data.SortOrder';
const server = Server.getInstance();
const ASType = AdventureSettings.Type;

export class Player {
	/**
	 * @param PNXPlayer {JPlayer}
	 */
	constructor (PNXPlayer) {
		this._PNXPlayer = PNXPlayer;
		this.DirectionAngle = new DirectionAngle(this._PNXPlayer);
		this.levels = getLevels();
		this.BossBarId = -1;
	}

	static PlayerMap = new Map();

	static getPlayer(PNXPlayer) {
		if (!this.PlayerMap.has(PNXPlayer.name)) {
			this.PlayerMap.set(PNXPlayer.name, new Player(PNXPlayer));
		}
		return this.PlayerMap.get(PNXPlayer.name);
	}

	get name() {// 显示的玩家名	String
		return this._PNXPlayer.getDisplayName();
	}

	get pos() {// 玩家所在坐标	FloatPos
		return new FloatPos(this._PNXPlayer.getPosition());
	}

	get blockPos() {// 玩家所在坐标	IntPos
		return new IntPos(this._PNXPlayer.getPosition());
	}

	get realName() {// 玩家的真实名字  String
		return this._PNXPlayer.getName();
	}

	get xuid() {// 玩家Uuid字符串	String
		return this._PNXPlayer.getLoginChainData().getXUID();
	}

	get uuid() {// 玩家Xuid字符串	String
		return this._PNXPlayer.getLoginChainData().getClientUUID();
	}

	get permLevel() {// 玩家的操作权限等级（0 - 4）	Integer
		return this._PNXPlayer.isOp() ? 1 : 0;
	}

	get gameMode() {// 玩家的游戏模式（0 - 3）	Integer
		return this._PNXPlayer.getGamemode();
	}

	get maxHealth() {// 玩家最大生命值	Integer
		return this._PNXPlayer.getMaxHealth();
	}

	get health() {// 	玩家当前生命值	Float
		return this._PNXPlayer.getHealth();
	}

	get inAir() {// 	玩家当前是否悬空	Boolean
		return this._PNXPlayer.getInAirTicks() > 0;
	}

	get inWater() {// 	玩家当前是否在水中	Boolean
		return this._PNXPlayer.isSwimming();
	}

	get sneaking() {// 	玩家当前是否正在潜行	Boolean
		return this._PNXPlayer.isSneaking();
	}

	get speed() {// 	玩家当前速度	Float
		return this._PNXPlayer.getMovementSpeed();
	}

	get direction() {// 玩家当前朝向	DirectionAngle
		return this.DirectionAngle;
	}

	get uniqueId() {// 	玩家（实体的）唯一标识符	String
		return this._PNXPlayer.getUniqueId().toString();
	}
	/**
	 * 判断玩家是否为OP
	 * @returns {boolean} 玩家是否为OP
	 */
	isOP() {
		return this._PNXPlayer.isOp();
	}
	/**
	 * 断开玩家连接
	 * @param msg {string} (可选参数)被踢出玩家出显示的断开原因
	 * @returns {boolean} 是否成功断开连接
	 */
	kick(msg) {
		return this._PNXPlayer.kick(msg);
	}
	/**
	 * @see {@link kick}
	 */
	disconnect(msg) {
		return this.kick(msg);
	}
	/**
	 * 发送一个文本消息给玩家
	 * @param msg {string} 待发送的文本
	 * @param type {Integer} (可选参数)发送的文本消息类型，默认为 0
	 * @returns {boolean} 是否成功发送
	 */	
	tell(msg, type = 0) {
		if (!sendText(server.getConsoleSender(), this._PNXPlayer, msg, type)) {
			return false;
		}
		return true;
	}
	/**
	 * @see {@link tell}
	 */
	sendText(msg, type) {
		return this.tell(msg, type);
	}
	/**
	 * 以某个玩家身份执行一条命令
	 * @param cmd {string} 待执行的命令
	 * @returns {boolean} 是否执行成功
	 */	
	runcmd(cmd) {
		return server.dispatchCommand(this._PNXPlayer, cmd);
	}
	/**
	 * 以某个玩家身份说话
	 * @param target {Player} (可选参数)模拟说话目标
	 * @param text {string} 模拟说话内容
	 * @returns {boolean} 是否执行成功
	 */	
	talkAs(target, text) {
		/*
		args1: target, text
		args2: text
		*/
		if (arguments.length === 2) {
			return sendText(this._PNXPlayer, target._PNXPlayer, text, 1);
		} else {
			var event = new PlayerChatEvent(this._PNXPlayer, target);
			server.getPluginManager().callEvent(event);
			if (!event.isCancelled()) {
				server.broadcastMessage(server.getLanguage().translateString(event.getFormat(), [event.getPlayer().getDisplayName(), event.getMessage()]), event.getRecipients());
			}
			return true;
		}
	}
	/**
	 * 传送玩家至指定位置
	 * @param x {IntPos|FloatPos} 目标位置坐标(或者使用 x, y, z, dimid 来确定玩家位置)
	 * @returns {boolean} 是否成功传送
	 */		
	teleport(x, y, z, dimid) {
		/*
		args1: x, y, z, dim

		args1: x, y, z, dimid
		args2: pos
		*/
		if (arguments.length === 1) {
			return this._PNXPlayer.teleport(x.position);
		} else {
			const level = server.getLevelByName(isNaN(dimid) ? dimid: this.levels[dimid]);
			if (level == null) {
				console.log('\nUnknow worlds: '+dimid+'\n  at Player.js -> teleport()');
				return false;
			}
			return this._PNXPlayer.teleport(Position.fromObject(new Vector3(x, y, z), level));
		}
	}
	/**
	 * 杀死玩家
	 * @returns {boolean} 是否成功执行
	 */	
	kill() {
		this._PNXPlayer.kill();
		return true;
	}
	/**
	 * 对玩家造成伤害
	 * @param damage {Integer} 对玩家造成的伤害数值
	 * @returns {boolean} 是否造成伤害
	 */	
	hurt(entity) {
		// test
		var d;
		if (this._PNXPlayer.getInventory().getItemInHand() != null) {
			d = this._PNXPlayer.getInventory().getItemInHand().getAttackDamage();
		} else {
			d = 1;
		}
		this._PNXPlayer.displaySwing();
		return entity.attack(new EntityDamageByEntityEvent(this._PNXPlayer, entity, EntityDamageEvent.DamageCause.ENTITY_ATTACK, d, 0.5));
	}
	/**
	 * 使指定玩家着火
	 * @param time {Integer} 着火时长，单位秒
	 * @returns {boolean} 是否成功着火
	 */	
	setOnFire(time) {
		this._PNXPlayer.setOnFire(time);
		return true;
	}
	/**
	 * 重命名玩家
	 * @param newname {string} 玩家的新名字
	 * @returns {boolean} 是否重命名成功
	 */	
	rename(newname) {
		this._PNXPlayer.setDisplayName(newname);
		return true;
	}
	/**
	 * 获取玩家当前站立所在的方块
	 * @todo 改为LLSE类型
	 * @returns {Block} 当前站立在的方块对象
	 */	
	getBlockStandingOn() {
		return this._PNXPlayer.getPosition().add(0, -0.1).getLevelBlock();
	}
	/**
	 * 获取玩家对应的设备信息对象
	 * @returns {Device} 玩家对应的设备信息对象
	 */	
	getDevice() {
		return new Device(this._PNXPlayer);
	}
	/**
	 * 获取玩家主手中的物品对象
	 * @todo 改为LLSE类型
	 * @returns {Item} 玩家主手中的物品对象
	 */	
	getHand() {
		return this._PNXPlayer.getInventory().getItemInHand();
	}

	/**
	 * 获取副手物品
	 * @todo 更改返回为LLSE类型
	 * @returns {Item} Item对象
	 */
	getOffHand() {
		return this._PNXPlayer.getInventory().getItemInOffHand();
	}

	/**
	 * 获取玩家背包对象
	 * @todo 更改返回为LLSE类型
	 * @returns {Container} Container对象
	 */
	getInventory() {
		return this._PNXPlayer.getInventory();
	}

	/**
	 * 获取玩家盔甲栏对象
	 * @todo 更改返回为LLSE类型
	 * @returns {Container} Container对象
	 */
	getArmor() {
		return this._PNXPlayer.getInventory().getArmorContents();// Item[]
	}

	/**
	 * 获取玩家末影箱对象
	 * @todo 更改返回为LLSE类型
	 * @returns {Container} Container对象
	 */
	getEnderChest() {
		return this._PNXPlayer.getEnderChestInventory();
	}

	/**
	 * 获取玩家重生点位置
	 * @returns {IntPos} IntPos对象
	 */
	getRespawnPosition() {
		return new IntPos(this._PNXPlayer.spawnPosition);
	}

	/**
	 * 设置获取玩家重生点位置
	 * @param x {number} x
	 * @param y {number} y
	 * @param z {number} z
	 * @param dimid {number} 维度id
	 * @returns {boolean} 是否成功修改
	 */
	setRespawnPosition(x, y, z, dimid) {
		// args1: pos
		// args2: x,y,z,dimid
		// args2: x,y,z,dim
		if (arguments.length === 1) {
			return this._PNXPlayer.setSpawn(x.position);
		} else {
			const level = server.getLevelByName(isNaN(dimid) ? dimid: this.levels[dimid]);
			if (level == null) {
				console.log('\nUnknow worlds: '+dimid+'\n  at Player.js -> teleport()');
				return false;
			}
			return this._PNXPlayer.setSpawn(Position.fromObject(new Vector3(x, y, z), level));
		}
		return true;
	}

	/**
	 * 给予玩家一个物品
	 * @todo 待实现LLSE类型的 Item
	 * @param item {Item} 物品对象
	 * @returns {boolean} 是否成功给予
	 */
	giveItem(item) {
		this._PNXPlayer.giveItem(item);
		return true;
	}

	/**
	 * 清除玩家背包中所有指定类型的物品
	 * @todo 待实现LLSE类型的 Item
	 * @todo 类型未知
	 * @param type {string} 要清除的物品对象类型名
	 * @returns {number} 清除的物品个数
	 */
	clearItem(type) {
		return 0;
	}

	/**
	 * 刷新玩家物品栏、盔甲栏
	 * @returns {boolean} 是否成功
	 */
	refreshItems() {
		return true;
	}

	/**
	 * 刷新玩家加载的所有区块
	 * @returns {boolean} 是否成功
	 */
	refreshChunks() {
		return true;
	}

	/**
	 * 修改玩家操作权限 （0、1、4） 普通、OP、OP+
	 * @param level {number} 目标操作权限等级
	 * @returns {boolean} 是否成功
	 */
	setPermLevel(level) {
		if (level < 1) {
			this._PNXPlayer.setOp(false);
		} else {
			this._PNXPlayer.setOp(true);
		}
		return true;
	}

	/**
	 * 修改玩家游戏模式（0~2）
	 * @param mode {number} 目标游戏模式
	 * @returns {boolean} 是否成功
	 */
	setGameMode(mode) {
		return this._PNXPlayer.setGamemode(mode);
	}

	/**
	 * 提高玩家经验等级
	 * @param count {number} 要提升的经验等级
	 * @returns {boolean} 是否成功
	 */
	addLevel(count) {
		if (isNaN(count)) {
			return false;
		}
		this._PNXPlayer.setExperience(this._PNXPlayer.getExperien(), this._PNXPlayer.getExperienceLevel() + Number(count));
		return true;
	}

	/**
	 * 获取玩家经验等级
	 * @returns {number} 玩家经验等级
	 */
	getLevel() {
		return this._PNXPlayer.getExperienceLevel();
	}

	/**
	 * 重置玩家经验
	 * @returns {boolean} 是否成功
	 */
	resetLevel() {
		this._PNXPlayer.setExperience(0);
		return true;
	}

	/**
	 * 获取玩家升级所需的经验值
	 * @returns {number} 玩家升级所需的经验值
	 */
	getXpNeededForNextLevel() {
		return this._PNXPlayer.calculateRequireExperience(this.getLevel()) - this._PNXPlayer.getExperien();
	}

	/**
	 * 提高玩家经验值
	 * @param count {number} 要提升的经验值
	 * @returns {boolean} 是否成功
	 */
	addExperience(count) {
		if (isNaN(count)) {
			return false;
		}
		this._PNXPlayer.setExperience(this._PNXPlayer.getExperien() + Number(count), this.getLevel(), true);
		return true;
	}

	/**
	 * 传送玩家至指定服务器
	 * @param server {string} 目标服务器 IP / 域名
	 * @param [port=19132] {number} 目标服务器端口
	 * @returns {boolean} 是否成功
	 */
	transServer(server, port = 19132) {
		this._PNXPlayer.transfer(new InetSocketAddress(server, port));
		return true;
	}

	/**
	 * 使玩家客户端崩溃
	 * @todo 待实现
	 * @returns {boolean} 是否成功
	 */
	crash() {
		this._PNXPlayer.kick('crash');
		return true;
	}

	/**
	 * 设置玩家自定义侧边栏
	 * @todo 待实现
	 * @param title {string} 侧边栏标题
	 * @param data {object} 侧边栏对象内容对象
	 * @param [sortOrder=1] {number} 侧边栏内容的排序顺序。（0为升序，1为降序）
	 * @returns {boolean} 是否成功
	 */
	setSidebar(title, data, sortOrder = 1) {
		//scoreborad.setSort(SortOrder.values()[sortOrder]);
		//server.getScoreboardManager().setDisplay(DisplaySlot.SIDEBAR, )
		return true;
	}

	/**
	 * 移除玩家自定义侧边栏
	 * @todo 待实现
	 * @returns {boolean} 是否成功
	 */
	removeSidebar() {
		//server.getScoreboardManager().removeDisplay(DisplaySlot.SIDEBAR);
		return true;
	}

	/**
	 * 设置玩家看到的自定义 Boss 血条
	 * @param title {string} 自定义血条标题
	 * @param percent {number} 血条中的血量百分比（0~100）
	 * @param color {number} 血条颜色 (默认值为 2 (RED))
	 * @returns {boolean} 是否成功
	 */
	setBossBar(title, percent, color = 2) {
		if (this.BossBarId === -1) {
			this.BossBarId = this._PNXPlayer.createBossBar(title, percent);
			if (color != 2) {
				this._PNXPlayer.getDummyBossBar(this.BossBarId).setColor(BossBarColor.values()[color]);
			}
		} else {
			this.updateBossBar(title, percent, this.BossBarId);
			if (color != 2) {
				this._PNXPlayer.getDummyBossBar(this.BossBarId).setColor(BossBarColor.values()[color]);
			}
		}
		return true;
	}

	/**
	 * 移除玩家看到的自定义 Boss 血条
	 * @returns {boolean} 是否成功
	 */
	removeBossBar() {
		if (this.BossBarId === -1) {
			return false;
		} else {
			this._PNXPlayer.removeBossBar(this.BossBarId);
			this.BossBarId = -1;
		}
		return true;
	}

	/**
	 * 获取玩家对应的 NBT 对象
	 * @todo 待实现
	 * @returns {NbtCompound} LLSE的NbtCompound对象
	 */
	getNbt() {
		return true;
	}

	/**
	 * 写入玩家对应的 NBT 对象
	 * @todo 待实现
	 * @param nbt {NbtCompound} NBT 对象
	 * @returns {boolean} 是否成功
	 */
	setNbt(nbt) {
		return true;
	}

	/**
	 * 为玩家增加一个 Tag
	 * @param tag {string} 要增加的 tag 字符串
	 * @returns {boolean} 是否成功
	 */
	addTag(tag) {
		if (this._PNXPlayer.containTag(tag)) {
			return false;
		}
		this._PNXPlayer.addTag(tag);
		return true;
	}

	/**
	 * 为玩家移除一个 Tag
	 * @param tag {string} 要移除的 tag 字符串
	 * @returns {boolean} 是否成功
	 */
	removeTag(tag) {
		if (!this._PNXPlayer.containTag(tag)) {
			return false;
		}
		this._PNXPlayer.removeTag(tag);
		return true;
	}

	/**
	 * 检查玩家是否拥有某个 Tag
	 * @param tag {string} 要检查的 tag 字符串
	 * @returns {boolean} 是否拥有
	 */
	hasTag(tag) {
		return this._PNXPlayer.containTag(tag);
	}

	/**
	 * 获取玩家拥有的所有 Tag 列表
	 * @returns {String[]} 玩家所有的 tag 字符串列表
	 */
	getAllTags() {
		return this._PNXPlayer.getAllTags().stream().map(item => {return item.parseValue()}).distinct().collect(Collectors.toList());
	}

	/**
	 * 获取玩家的 Abilities 能力列表（来自玩家 NBT）
	 * @todo 待完善，WTF mojang.
	 * @returns {object} 玩家所有能力信息的键 - 值对列表对象 例子：{'mayfly': number, ...}
	 */
	getAbilities() {
		return {
			"attackmobs": Number(this._PNXPlayer.getAdventureSettings().get(ASType.ATTACK_MOBS)),
			"attackplayers": Number(this._PNXPlayer.getAdventureSettings().get(ASType.ATTACK_PLAYERS)),
			"build": 1,// 建造，与nk冲突
			"doorsandswitches": Number(this._PNXPlayer.getAdventureSettings().get(ASType.DOORS_AND_SWITCHED)),
			"flySpeed": 0.05000000074505806,
			"flying": Number(this._PNXPlayer.getAdventureSettings().get(ASType.FILYING)),
			"instabuild": 0,// 迷惑..
			"invulnerable": Number(this._PNXPlayer.getAdventureSettings().get(ASType.NO_CLIP)),
			"lightning": 0,// 迷惑..
			"mayfly": Number(this._PNXPlayer.getAdventureSettings().get(ASType.ALLOW_FLIGHT)),
			"mine": 1,// 破坏，与nk冲突
			"op": Number(this._PNXPlayer.getAdventureSettings().get(ASType.OPERATOR)),
			"opencontainers": Number(this._PNXPlayer.getAdventureSettings().get(ASType.OPEN_CONTAINERS)),
			"permissionsLevel": Number(this._PNXPlayer.getAdventureSettings().get(ASType.OPERATOR)),// 与op相同
			"playerPermissionsLevel": 2,// [普通权限, ？, OP, 自定义权限]
			"teleport": Number(this._PNXPlayer.getAdventureSettings().get(ASType.TELEPORT)),
			"walkSpeed": 0.10000000149011612
		};
	}

	/**
	 * 获取玩家的 Attributes 属性列表（来自玩家 NBT）
	 * @todo 待完善
	 * @returns {array} 玩家所有属性对象的数组 键名有：Base Current DefaultMax DefaultMin Max Min Name
	 */
	getAttributes() {
		var myAttribute = [
			Attribute.ABSORPTION, 
			Attribute.SATURATION, 
			Attribute.EXHAUSTION, 
			Attribute.KNOCKBACK_RESISTANCE, 
			Attribute.MAX_HEALTH, 
			Attribute.MOVEMENT_SPEED, 
			Attribute.FOLLOW_RANGE, 
			Attribute.MAX_HUNGER, 
			Attribute.ATTACK_DAMAGE, 
			Attribute.EXPERIENCE_LEVEL, 
			Attribute.EXPERIENCE, 
			Attribute.LUCK
		];
		myAttribute.forEach((v, i) => {
			const javaAttribute = Attribute.getAttribute(v);
			myAttribute[i] = {
				"Base": javaAttribute.getDefaultValue(),
				"Current": javaAttribute.getDefaultValue(),
				"DefaultMax": javaAttribute.getMaxValue(),
				"DefaultMin": javaAttribute.getMinValue(),
				"Max": javaAttribute.getMaxValue(),
				"Min": javaAttribute.getMinValue(),
				"Name": javaAttribute.getName()
			}
		});
		myAttribute[Attribute.MAX_HEALTH].Max = this._PNXPlayer.getMaxHealth();
		myAttribute[Attribute.MAX_HEALTH].Current = this._PNXPlayer.getHealth() > 0 ? (this._PNXPlayer.getHealth() < this._PNXPlayer.getMaxHealth() ? this._PNXPlayer.getHealth() : this._PNXPlayer.getMaxHealth()) : 0;
		myAttribute[Attribute.MAX_HUNGER].Current = this._PNXPlayer.getFoodData().getLevel();
		myAttribute[Attribute.MOVEMENT_SPEED].Current = this._PNXPlayer.getMovementSpeed();
		myAttribute[Attribute.EXPERIENCE_LEVEL].Current = this._PNXPlayer.getExperienceLevel();
		myAttribute[Attribute.EXPERIENCE].Current = this._PNXPlayer.getExperience() / this._PNXPlayer.calculateRequireExperience(this._PNXPlayer.getExperienceLevel());
		return myAttribute;
	}

	/**
	 * 获取玩家疾跑状态
	 * @returns {boolean} 玩家疾跑状态
	 */
	isSprinting() {
		return this._PNXPlayer.isSprinting();
	}

	/**
	 * 设置玩家疾跑状态
	 * @param sprinting {boolean} 疾跑状态
	 * @returns {boolean} 是否成功
	 */
	setSprinting(sprinting) {
		this._PNXPlayer.setSprinting(sprinting);
		return true;
	}
}

export function sendText(sender = '', receiver, msg, type) {
	switch (type) {
		case 0: {
			receiver.sendMessage(msg);
			break;
		}
		case 1: {
			receiver.sendMessage('['+(sender && sender.getName())+' -> '+receiver.getName()+'] '+msg);
			break;
		}
		case 4: {
			receiver.sendPopup(msg);
			break;
		}
		case 5: {
			receiver.sendTip(msg);
			break;
		}
		default:
			return false;
	}
	return true;
}
export function getLevels() {
	var levels = [];
	/*for (var level of server.getLevels().values()) {
		levels[level.getDimension()] = level.getName();
	}
	levels[0] = server.getDefaultLevel().getName();*/
	levels[0] = EnumLevel.OVERWORLD.getLevel().getName();
	levels[1] = EnumLevel.NETHER.getLevel().getName();
	levels[2] = EnumLevel.THE_END.getLevel().getName();
	return levels;
}
