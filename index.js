var Redis = require('ioredis');

function Disque(key, redisOptions) {
  this.key = key;
  this.redis = new Redis(redisOptions);
}

Disque.prototype.push = function (data) {
  return this.redis.lpush(this.key, JSON.parse(data));
};

Disque.prototype.pop = function () {
  return this.redis.lpop(this.key);
};

module.exports = Disque;
