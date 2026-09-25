# Local WebSocket fan-out baseline

## Workload

- Local loopback benchmark: Node server, PostgreSQL, and simulated clients on one machine.
- One writer and 249 observers joined the same room (250 total clients).
- The writer sent 100 sequential Yjs document updates.
- Each measurement ran from the writer sending an update until every observer received it.
- The server persisted each update to PostgreSQL before broadcasting it.

## Results

| Run | Average | p50 | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| 1 | 2.19 ms | 2.12 ms | 2.93 ms | 5.86 ms |
| 2 | 2.37 ms | 2.20 ms | 3.92 ms | 6.84 ms |
| 3 | 2.29 ms | 2.18 ms | 3.28 ms | 4.88 ms |

Median across the three runs:

| Average | p50 | p95 | Max |
| ---: | ---: | ---: | ---: |
| 2.29 ms | 2.18 ms | 3.28 ms | 5.86 ms |

## Interpretation

Under this local, sequential workload, full-room persisted Yjs update fan-out remained below 4 ms at p95 for 250 connected clients. These figures are a local development baseline, not an internet or production-capacity claim.

## Next experiment

Run a mixed-room benchmark (for example, 10 clients in the target room and 240 in unrelated rooms). That will measure the cost of scanning every `wss.clients` entry for each update and provide a before/after baseline for room-scoped connection sets.
