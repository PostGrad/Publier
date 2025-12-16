### Posts table (initial - minimal)

```
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Decision                | Reason               |
| ----------------------- | -------------------- |
| UUID PK                 | Safe for public APIs |
| `status` enum via CHECK | Portable, explicit   |
| Nullable `scheduled_at` | Draft vs scheduled   |
