# Request Tracing

Each API request is assigned a unique `request_id`.

## Behavior

- A `request_id` is generated at the edge if not provided
- The `request_id` is included in:
  - API responses
  - Error responses
  - Application logs

## Benefits

- Easier debugging across services
- Faster incident investigation
- Improved communication with API consumers
