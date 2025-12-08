
/**
 * 服务端配置中心 (Server Configuration)
 * 集中管理环境变量和系统常量，方便统一修改和维护。
 */

// JWT 签名密钥，生产环境请务必通过环境变量设置
export const JWT_SECRET = process.env.JWT_SECRET || 'skycraft_secret_key_change_me';

// 管理员后台登录密码
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// SQLite 数据库文件路径
export const DB_PATH = process.env.DB_PATH || 'skycraft.db';

// 服务运行端口
export const PORT = Number(process.env.PORT) || 3000;

// 默认 AI 模型
export const DEFAULT_AI_MODEL = 'gemini-2.5-flash';
