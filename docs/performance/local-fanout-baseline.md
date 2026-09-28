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

## Mixed-room global-scan experiment

This scenario used 250 total clients:

- One writer and nine observers in the target room.
- 240 connected clients in an unrelated room.
- The writer sent 100 sequential Yjs updates to the target room.
- The server still scanned all `wss.clients` entries for each update, but broadcast only to the nine target-room observers.

| Run | Average | p50 | p95 |
| --- | ---: | ---: | ---: |
| 1 | 0.69 ms | 0.58 ms | 0.95 ms |
| 2 | 0.49 ms | 0.46 ms | 0.74 ms |
| 3 | 0.52 ms | 0.48 ms | 0.70 ms |

Median across the three runs:

| Average | p50 | p95 |
| ---: | ---: | ---: |
| 0.52 ms | 0.48 ms | 0.74 ms |

## Findings

At 250 local connections, sending an update to many room members cost substantially more than filtering unrelated clients from the global WebSocket set. The 250-client mixed-room scenario completed faster than the 250-client single-room fan-out scenario because it sent to nine observers rather than 249.

This baseline does not justify replacing the global scan with room-scoped connection sets yet. Revisit the comparison at a larger total connection count or after a workload change.
