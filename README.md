# ember-app-suite

This README outlines the details of collaborating on this Ember application.
A short introduction of this app could easily go here.

## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [Ember CLI](https://cli.emberjs.com/release/)
- [Google Chrome](https://google.com/chrome/)

## Installation

- `git clone <repository-url>` this repository
- `cd ember-app-suite`
- `pnpm install`
- Add the entry point component to `package.json` under `peek-extensions`
```
...
"exports": {
  "./tests/*": "./tests/*",
  "./*": "./app/*"
},
"peek-extensions": {
  "entry-point": "extension-trigger.gjs"
}
```

## Running / Development

- `vite`
- Visit your app at [http://localhost:4205](http://localhost:4205).
- Access the built extension at [http://localhost:4205/assets/extension-files/bundle.gjs](http://localhost:4205/assets/extension-files/bundle.gjs).

## Further Reading / Useful Links

- [ember.js](https://emberjs.com/)
- [ember-cli](https://cli.emberjs.com/release/)
- Development Browser Extensions
  - [ember inspector for chrome](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi)
  - [ember inspector for firefox](https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/)
