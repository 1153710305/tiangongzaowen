# 腾讯云 CentOS 7.6Docker 部署手册

本文档详细说明如何在腾讯云新加坡节点（系统为 CentOS 7.6）上，使用 Docker 和 Docker Compose 部署本项目。

## 1. 环境准备

### 1.1 更新系统与安装必要工具
登录服务器后，首先更新系统软件包并安装基础工具。

```bash
# 更新系统
yum update -y

# 安装 yum-utils, git, lvm2 等工具
yum install -y yum-utils device-mapper-persistent-data lvm2 git
```

### 1.2 安装 Docker
CentOS 7.6 默认源中的 Docker 可能较旧，推荐安装 Docker CE（社区版）。

```bash
# 添加 Docker 官方源
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker CE
yum install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker 并设置开机自启
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
```

### 1.3 安装 Docker Compose
Docker Compose 用于编排容器服务。

```bash
# 下载 Docker Compose (v2.29.1)
curl -L "https://github.com/docker/compose/releases/download/v2.29.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
chmod +x /usr/local/bin/docker-compose

# 创建软链接（可选，方便调用）
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# 验证安装
docker-compose --version
```

---

## 2. 项目文件配置

假设我们将项目部署在 `/data/tiangongzaowen` 目录下。

### 2.1 获取代码
您可以通过 git 拉取代码，或者将本地代码上传至服务器。

```bash
mkdir -p /data/tiangongzaowen
cd /data/tiangongzaowen
# 这里请使用 git clone 或上传文件
# git clone <your-repo-url> .
```

### 2.2 创建 `Dockerfile`
在项目根目录（即 `/data/tiangongzaowen`）下创建名为 `Dockerfile` 的文件，内容如下：

```dockerfile
# === 构建阶段 ===
FROM node:20 AS builder
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源码
COPY . .

# 构建前端 (生成 dist 目录)
RUN npm run build

# === 运行阶段 ===
FROM node:20-slim
WORKDIR /app

# 安装运行环境依赖 (better-sqlite3 可能需要 python3 和构建工具)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 仅安装生产依赖
COPY package*.json ./
RUN npm install --omit=dev

# 安装 tsx 用于运行 TypeScript 后端
RUN npm install -g tsx

# 复制后端源码
COPY server ./server

# 从构建阶段复制构建好的前端静态文件
COPY --from=builder /app/dist ./dist

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/skycraft.db

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["tsx", "server/index.ts"]
```

### 2.3 创建 Nginx 配置文件 `nginx.conf`
在项目根目录下创建 `nginx.conf`，用于反向代理和静态资源服务。

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _; # 初始配置，后续替换为您的域名

    # 开启 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 转发
    location /api/ {
        proxy_pass http://app:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 支持流式输出 (用于 AI 生成打字机效果)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # 后台管理接口转发
    location /admin/ {
        proxy_pass http://app:3000/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2.4 创建 `docker-compose.yml`
在项目根目录下创建 `docker-compose.yml`。

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: skycraft-app
    restart: always
    environment:
      # 【重要】请修改为随机生成的安全密钥
      - JWT_SECRET=change_me_to_a_secure_random_string_12345
      - DB_PATH=/app/data/skycraft.db
    volumes:
      # 挂载数据库文件，确保持久化
      - ./data:/app/data
      # 将容器内生成的 dist 目录共享给 volume
      - static-content:/app/dist

  nginx:
    image: nginx:alpine
    container_name: skycraft-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # 挂载 Nginx 配置
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      # 从 volume 读取静态文件
      - static-content:/usr/share/nginx/html
      # 预留 SSL 证书目录挂载
      # - ./cert:/etc/nginx/certs
    depends_on:
      - app

volumes:
  static-content:
```

---

## 3. 启动服务

### 3.1 初次启动
在项目根目录下执行以下命令构建镜像并启动容器：

```bash
# -d 表示后台运行, --build 表示强制构建镜像
docker-compose up -d --build
```

### 3.2 验证状态
```bash
docker-compose ps
```
如果 `State` 显示为 `Up`，则说明服务启动成功。
此时您可以通过服务器 IP 访问网站（例如 `http://1.2.3.4`）。

---

## 4. 配置域名与 SSL (HTTPS)

为了提升安全性和用户体验，建议配置 HTTPS。

### 4.1 域名解析
登录您的域名服务商控制台（如腾讯云 DNS 解析），添加一条 `A` 记录：
*   **主机记录**: `@` 或 `www` (根据您的需求)
*   **记录值**: 填写您的服务器公网 IP 地址

### 4.2 申请 SSL 证书 (使用 Certbot)
推荐使用 Certbot 申请免费的 Let's Encrypt 证书。

1.  **安装 Certbot**
    ```bash
    yum install -y epel-release
    yum install -y certbot
    ```

2.  **申请证书**
    由于 Nginx 占用了 80 端口，我们先暂时停止 Nginx：
    ```bash
    docker-compose stop nginx
    ```

    运行 Certbot（将 `yourdomain.com` 替换为您的实际域名）：
    ```bash
    certbot certonly --standalone -d yourdomain.com --email your_email@example.com --agree-tos
    ```
    成功后，证书文件会生成在 `/etc/letsencrypt/live/yourdomain.com/` 目录下。

### 4.3 配置 Nginx 支持 HTTPS

1.  **修改 `docker-compose.yml`**
    取消 SSL 证书挂载的注释，并将宿主机路径指向 Certbot 生成的目录。

    ```yaml
      nginx:
        # ... (其他配置不变)
        volumes:
          - ./nginx.conf:/etc/nginx/conf.d/default.conf
          - static-content:/usr/share/nginx/html
          # 挂载证书目录 (注意只读权限 :ro)
          - /etc/letsencrypt:/etc/nginx/certs:ro
    ```

2.  **修改 `nginx.conf`**
    更新配置以启用 HTTPS。将文件内容替换为：

    ```nginx
    server {
        listen 80;
        server_name yourdomain.com; # 【替换为您的域名】
        # 强制 HTTP 跳转 HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com; # 【替换为您的域名】

        # SSL 证书路径 (对应 docker-compose 中挂载的路径)
        ssl_certificate /etc/nginx/certs/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/live/yourdomain.com/privkey.pem;

        # SSL 优化配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # 开启 gzip
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

        # 前端静态文件
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # 后端 API
        location /api/ {
            proxy_pass http://app:3000/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_buffering off;
        }

        # 后台管理
        location /admin/ {
            proxy_pass http://app:3000/admin/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
    ```

### 4.4 重启服务
```bash
# 重新创建容器以应用挂载和配置变更
docker-compose up -d --force-recreate
```

现在，您的网站可以通过 `https://yourdomain.com` 访问了。

---

## 5. 常用维护命令

*   **查看应用日志**：
    ```bash
    docker-compose logs -f app
    ```
*   **查看 Nginx 日志**：
    ```bash
    docker-compose logs -f nginx
    ```
*   **重启服务**：
    ```bash
    docker-compose restart
    ```
*   **停止服务**：
    ```bash
    docker-compose down
    ```
*   **更新代码流程**：
    1.  `git pull` 拉取最新代码
    2.  `docker-compose up -d --build` 重新构建并启动

## 6. 数据备份
所有重要数据（数据库文件）都保存在项目根目录下的 `data/` 文件夹中。
建议定期备份该目录下的 `skycraft.db` 文件。
