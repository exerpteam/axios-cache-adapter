async function limit (config) {
  // compute the time it takes to check the cache size
  const start = Date.now()
  const length = await config.store.length()
  const end = Date.now()
  const time = end - start
  // if time is more than 1 second, then we should probably purge everything        

  config.debug(`Current store size: ${length} time took to check: ${time}ms`)
  if (length > config.limit * 2 || (time > 1000 && length > config.limit)) {
    config.info(`Clearing store. Size: ${length} Time took to check: ${time}ms`)
    try {
      await config.store.clear()
      config.info('Cleared cache store')
    } catch (err) {
      config.info('Could not clear cache store: ' + err)
    }
    return
  }

  if (length < config.limit) return

  let firstItem

  // await config.store.iterate((value, key) => {
  //   if (!firstItem) firstItem = { value, key }
  //   if (value.expires < firstItem.value.expires) firstItem = { value, key }
  // })

  let cursor = '0'
  let safeguard = config.limit * 2
  while (safeguard-- > 0) {
    const [nextCursor, keys] = await config.store.hscan(cursor)
    for (let i = 0; i < keys.length; i += 2) {
      const key = keys[i]
      const value = keys[i + 1]
      const expires = Number(JSON.parse(value).expires)
      if (expires <= Date.now()) {
        firstItem = { key, value }
        break // exit the loop after finding the first expired item
      }
    }
    if (nextCursor === '0' || firstItem) {
      break
    }
    cursor = nextCursor
  }

  if (firstItem) {
    config.debug(`Removing item: ${firstItem.key}`)

    await config.store.removeItem(firstItem.key)
  }
}

export default limit
