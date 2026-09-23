# 🐶 2000 Puppies

**▶ Play it here: https://johnhenryburns.github.io/two-thousand-puppies/**

A little browser game to celebrate a kid's 2,000th day alive: one puppy for every day.
(Any number of days up to about 7 years works, see `days` below.)

Zoomed out, all 2,000 puppies are tiny particles you can shoo around with a finger or mouse.
Zoomed in, you can pet them, give them treats, throw a ball, and call them over.
Every puppy has a name and a day number, so puppy #1 is the day she was born and
puppy #2000 is the celebration day.

Plain HTML, CSS and JavaScript. No build step, no dependencies beyond a Google Font.

## Play

Visit [johnhenryburns.github.io/two-thousand-puppies](https://johnhenryburns.github.io/two-thousand-puppies/), or open `index.html` in a browser.

- **✋ Hand**: far away, wave through the crowd to shoo. Up close, tap a puppy to pet it.
- **📣 Call**: press and hold, and the nearby puppies come running. Let go and they wander off again.
- **🎁 Play** menu: a **🦴 Treat** (tap the grass to drop one), the **🎾 Ball** (tap to throw, the nearest puppy fetches it back), or a **📻 Dance party** (tap to put down a boombox; up to 40 nearby puppies bounce to the beat while notes float out of it, for 40 seconds or until you tap the boombox again).
- **Commands**: tap a puppy and its card offers **Sit**, **Lie down**, **Roll over**, **Beg** and **Jump**.
- **✨ Surprise**: all 2,000 puppies form a heart or a smiley, spell her name, or line up in 20 blocks of 100.
- **⋯ More**: sound on/off and the help screen.
- Puppies occasionally take a potty break (a puddle or a poo with a few flies) that fades after a while.
- Zoom with the scroll wheel, pinch, double-click, or the ➕ ➖ buttons. Drag the grass to look around. The minimap in the corner jumps anywhere.

Petted puppies get a collar and count toward the "Petted x of 2000" progress bar, which is saved in the browser.

## Personalising it

The title screen has a name field and, under "For grown-ups", a birthday field.
Both are saved in the browser. You can also set them in the URL, which is handy for a link
you send to a tablet:

```
https://johnhenryburns.github.io/two-thousand-puppies/?name=Lily&birthday=2021-04-02
https://johnhenryburns.github.io/two-thousand-puppies/?name=Ada&days=1846
```

- `name`: shown in the title, the intro, and the "Spell my name" formation.
- `birthday`: `YYYY-MM-DD`. The number of puppies becomes the number of days from that birthday
  to today (the birthday itself is day 1), so the link stays correct every day it is opened.
  Puppy #n is dated `birthday + (n - 1)` days. If `birthday` is given, `days` is ignored.
- `days`: a fixed number of days to celebrate, which is how many puppies there are. Defaults to 2000.
  Use it when you want a specific number, for example `?name=Ada&days=1846`. If unset and there is
  no birthday, the game assumes today is day 2,000.
- Either way the count is kept between 10 and 2600 (about 7 years). Anyone older gets a note on the
  title screen that the rest of their puppies are at the park, and the maximum is drawn. Every bit of text, the intro
  count, the "Count by 100s" formation, and the milestones follow it, and petting progress is saved
  separately per number.
- `intro=0`: skip the title screen. Optional `zoom`, `x`, `y` set the starting camera.

## Files

- `index.html`: markup for the HUD, title screen, and help.
- `style.css`: styles.
- `game.js`: everything else. Puppies are drawn procedurally on a canvas and cached as sprites; at high zoom they're drawn as vectors so they stay crisp. A spatial hash keeps the 2,000-body crowd simulation cheap.
