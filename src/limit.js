async function limit (config) {
  const length = await config.store.length()

  if (length < config.limit) return

  config.debug(`Current store size: ${length}`)
  if (length > config.limit * 2) {
    config.debug('Clearing cache store')
    await config.store.clear()
    return
  }

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
