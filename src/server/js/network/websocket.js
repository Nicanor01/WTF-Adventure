import serve from 'serve-static';
import http from 'http';
import StaticConnection from 'connect';
import SocketIO from 'socket.io';
import log from '../util/log';
import Socket from './socket';
import Utils from '../util/utils';

class Connection {
  constructor(id, socket, server) {
    this.id = id;
    this.socket = socket;
    this._server = server; // eslint-disable-line

    this.socket.on('message', (message) => {
      if (this.listenCallback) {
        this.listenCallback(JSON.parse(message));
      }
    });

    this.socket.on('disconnect', () => {
      log.notice(`Closed socket: ${this.socket.conn.remoteAddress}`);

      if (this.closeCallback) {
        this.closeCallback();
      }

      delete this._server.removeConnection(this.id);
    });
  }

  listen(callback) {
    this.listenCallback = callback;
  }

  onClose(callback) {
    this.closeCallback = callback;
  }

  send(message) {
    this.sendUTF8(JSON.stringify(message));
  }

  sendUTF8(data) {
    this.socket.send(data);
  }
}

class Server extends Socket {
  constructor(host, port, version) {
    super(port);

    this.host = host;
    this.version = version;
    this._connections = {};
    this._counter = 0;
    this.ips = {};

    // Serve statically for faster development
    const app = StaticConnection();

    app.use(serve('client', {
      index: ['index.html'],
    }), null);

    this.httpServer = http
      .createServer(app)
      .listen(port, host, () => {
        log.notice(`Server is now listening on: ${port}`);
      });

    this.io = new SocketIO(this.httpServer);
    this.io.on('connection', (socket) => {
      log.notice(`Received connection from: ${socket.conn.remoteAddress}`);

      const client = new Connection(this.createId(), socket, this);

      socket.on('client', (data) => {
        // check the client version of socket.io matches the server version
        if (data.gVer !== this.version) {
          client.sendUTF8('updated');
          log.notice(data.gVer);
          log.notice(this.version);
          client.close('Client version is out of sync with the server.');
        }

        if (this.connectionCallback) {
          this.connectionCallback(client);
        }

        this.addConnection(client);
      });

      socket.on('u_message', (message) => {
        // Used for unity messages as Socket.IO differs

        if (client.listenCallback) client.listenCallback(message);
      });
    });
  }

  createId() {
    this._counter += 1;
    return `1${Utils.random(99)}${this._counter}`;
  }

  broadcast(message) {
    this.forEachConnection((connection) => {
      connection.send(message);
    });
  }

  onConnect(callback) {
    this.connectionCallback = callback;
  }

  onRequestStatus(callback) {
    this.statusCallback = callback;
  }
}

export default {
  Server,
  Connection,
};
