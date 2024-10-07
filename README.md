# Gartic

简单的你画我猜游戏。inspired by gartic.io

## 设置 WebSocket 服务器

假设你位于项目根目录下：

### 切换目录

```bash
cd server
```

### 创建虚拟环境

#### Windows

```cmd
python -m venv venv
call venv/scripts/activate.bat
```

#### Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

### 安装依赖项

```bash
pip install -r requirements.txt
```

### 启动服务器

启动前先确定两个参数：

- 服务器的局域网地址 `addr`（如 `192.168.0.1`），可以用 `ipconfig` 或 `ifconfig` 命令找到。
- 词库文件 `wordbase`，通常为 `txt` 格式每行一个。在 `wordbase` 目录下可以找到一些我们提供的词库示例。

```
python server.py {wordbase} --addr {addr}
```

其他参数请参见 `--help` 命令的输出。

服务器启动后，应该看到类似于下面的日志输出：

```
[INFO 2024-09-01 11:41:06] server running on ws://192.168.0.1:1226
[INFO 2024-09-01 11:41:06] waiting for players
```

记住 `ws://192.168.0.1:1226` 这个地址，在客户端启动时需要提供以便连接。

## 设置 HTTP 服务器

你可以使用任何支持静态资源的 HTTP 服务器（e.g. [nginx](https://nginx.org/)）来服务前端。我们以 Python 的 `http.server` 为例（请勿用于生产环境）：

```bash
cd app
python -m http.server 1440
```

此时，可以从局域网内任意设备访问 HTTP 1440 端口进入游戏：

```
http://192.168.0.1:1440
```

进入后按照提示操作即可。
