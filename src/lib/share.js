// Native share sheet where the device has one (every phone), clipboard
// everywhere else. Returns what actually happened so the UI can confirm it.
export async function shareOrCopy({ title, text, url }) {
  const link = url || window.location.href

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: link })
      return 'shared'
    } catch (err) {
      // the user closing the sheet is not a failure
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  try {
    await navigator.clipboard.writeText(link)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export const SHARE_MESSAGE = {
  shared: 'Shared',
  copied: 'Link copied',
  cancelled: '',
  failed: "Couldn't share — copy the link from your address bar.",
}
