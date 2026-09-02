import posthog from 'posthog-js'

// Ключ проекта PostHog (публичный, безопасен во фронтенде)
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_Cv8tFzk5JmDFi9qGUCrKkoahwDNdeTh2vn8uQxKc5qui'
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

if (typeof window !== 'undefined' && !posthog.__loaded) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
  })
}

export default posthog