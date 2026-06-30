const QUEUE_KEY = 'tmc_offline_queue'

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent('tmc-queue-changed', { detail: { count: queue.length } }))
}

export function enqueue(type, data) {
  const queue = getQueue()
  const item = {
    id: crypto.randomUUID(),
    type,
    data,
    timestamp: new Date().toISOString(),
  }
  queue.push(item)
  saveQueue(queue)
  return item
}

export function removeFromQueue(id) {
  saveQueue(getQueue().filter(item => item.id !== id))
}

export function getPendingCount() {
  return getQueue().length
}
