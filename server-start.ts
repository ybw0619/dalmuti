import { config } from 'dotenv';
import { createServer } from 'http';
import next from 'next';
import { setupSocketServer } from './server';

// .env.local 파일 로드
config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.SERVER_HOST || 'localhost';
const port = parseInt(process.env.PORT || '3456', 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  // Socket.io 서버 설정
  setupSocketServer(httpServer);

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
