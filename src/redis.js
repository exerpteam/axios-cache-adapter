import { promisify } from 'util'

import { mapObject } from './utilities'

class RedisStore {
  constructor (client, HASH_KEY = 'axios-cache') {
    const invalidClientError = new TypeError(
      'First parameter must be a valid RedisClient instance.'
    )

    try {
      if (client.constructor.name !== 'RedisClient') {
        throw invalidClientError
      }
    } catch (err) {
      throw invalidClientError
    }
    this.client = client
    this.HASH_KEY = HASH_KEY
    this.hgetAsync = promisify(client.hget).bind(client)
    this.hsetAsync = promisify(client.hset).bind(client)
    this.hdelAsync = promisify(client.hdel).bind(client)
    this.delAsync = promisify(client.del).bind(client)
    this.hlenAsync = promisify(client.hlen).bind(client)
    this.hgetallAsync = promisify(client.hgetall).bind(client)
    this.hscanAsync = promisify(client.hscan).bind(client)
  }

  async getItem (key) {
    if (!this.client.connected) {
      return null
    }
    const item = (await this.hgetAsync(this.HASH_KEY, key)) || null
    return JSON.parse(item)
  }

  async setItem (key, value) {
    if (!this.client.connected) {
      return value
    }
    await this.hsetAsync(this.HASH_KEY, key, JSON.stringify(value))
    return value
  }

  async removeItem (key) {
    if (!this.client.connected) {
      return
    }
    await this.hdelAsync(this.HASH_KEY, key)
  }

  async clear () {
    if (!this.client.connected) {
      return
    }
    await this.delAsync(this.HASH_KEY)
  }

  async length () {
    if (!this.client.connected) {
      return 0
    }
    return this.hlenAsync(this.HASH_KEY)
  }

  async hscan (cursor) {
    if (!this.client.connected) {
      return [0, []]
    }
    return this.hscanAsync(this.HASH_KEY, cursor, 'MATCH', '*', 'COUNT', 10)
  }

  async iterate (fn) {
    const hashData = await this.hgetallAsync(this.HASH_KEY)
    return Promise.all(mapObject(hashData, fn))
  }
}

export default RedisStore
