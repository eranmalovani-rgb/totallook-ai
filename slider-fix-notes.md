# Auth State Analysis

- `user` is `meQuery.data ?? null` — so it's null when not logged in, but also null while loading
- `loading` is `meQuery.isLoading || logoutMutation.isPending`
- The redirect in NewLanding fires on `if (user)` — this is correct, it only redirects when user is truthy
- The browser session has the auth cookie persisted, so even after clearing JS cookies, the httpOnly cookie remains
- The dev server preview is showing the upload page because the browser IS logged in (httpOnly cookie)
- The slider fix should work for guests — just can't test it from this browser session

# Slider Fix Summary
- Rewrote using clip-path: inset(0 <right-clip> 0 0) approach
- Both images are full-size absolute positioned with object-cover
- No width manipulation — just clipping
- PointerEvents API for unified mouse/touch handling
- Auto-slide animation resets on upgrade switch via sliderKey
