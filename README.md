# SpeexJS

Monorepo for **speexkit** - the JavaScript/TypeScript utility toolkit.

## Packages

| Package                       | Description                                                                                          | npm                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| [speexkit](./packages/speex)  | Utility toolkit: NDArray, ML, Stats, validation, functional, date, async. 400+ functions, zero deps. | `npm install speexkit` |
| [speexjs](./packages/speexjs) | Web framework for TypeScript                                                                         | (in development)       |

## speexkit Quick Start

```bash
npm install speexkit
```

```typescript
import { NDArray } from "speexkit/nlarray";
import { StandardScaler } from "speexkit/ml";
import { normalPDF, ttestInd } from "speexkit/stats";
import { curry, pipe } from "speexkit/nlfunction";
import { isEmail, isStrongPassword } from "speexkit/validation";
```

## Development

```bash
pnpm install
cd packages/speex
npm run build
npm test
```

MIT
