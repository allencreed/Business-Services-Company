# Hero Sizzle Reel — Site Integration

Once `renders/sizzle.mp4` exists, drop this into the hero section of the site's `index.html`:

```html
<video
  class="hero-video"
  autoplay
  muted
  loop
  playsinline
  preload="metadata"
  poster="videos/imperium-sizzle/assets/building.jpg"
  aria-hidden="true"
>
  <source src="videos/imperium-sizzle/renders/sizzle.mp4" type="video/mp4" />
</video>
```

Suggested CSS (full-bleed hero background):

```css
.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}
```

Notes:

- `muted` is required for autoplay to work in Chrome/Safari; `playsinline` prevents iOS fullscreen takeover.
- The poster (`assets/building.jpg`) matches the reel's opening frame palette, so the swap is seamless.
- Reel is 1920x1080 @ 30fps, ~16.5s, and loops cleanly back to the navy opening.
