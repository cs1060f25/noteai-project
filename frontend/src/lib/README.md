# API Client Usage

## Setup

1. Copy `.env.example` to `.env` and configure your API URL:

```bash
cp .env.example .env
```

2. Update `VITE_API_URL` in `.env`:

```
VITE_API_URL=http://localhost:8000/api
```

## Basic Usage

```tsx
import { apiClient } from '@/lib/api';

// Simple GET request
const users = await apiClient.get('/users');

// POST with data
const newUser = await apiClient.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// PUT update
const updated = await apiClient.put('/users/123', { name: 'Jane' });

// DELETE
await apiClient.delete('/users/123');
```

## With TypeScript Types

```tsx
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

// Type-safe GET request
const users = await apiClient.get<User[]>('/users');

// Type-safe POST request
const newUser = await apiClient.post<User>('/users', {
  name: 'John',
  email: 'john@example.com',
});
```

## In React Components

```tsx
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiClient.get<User[]>('/users');
        setUsers(data);
      } catch (err) {
        setError('Failed to fetch users');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

## Features

✅ **Automatic Authorization**: Adds Bearer token from localStorage
✅ **Error Handling**: Handles 401, 403, 404, 500 errors automatically
✅ **Request Logging**: Logs all requests/responses in development
✅ **TypeScript Support**: Full type safety
✅ **Timeout**: 30-second default timeout
✅ **Interceptors**: Easily customize request/response behavior

## Advanced Usage

For more control, use the raw axios instance:

```tsx
import api from '@/lib/api';

// Custom request with full axios control
const response = await api.request({
  method: 'POST',
  url: '/upload',
  data: formData,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  onUploadProgress: (progressEvent) => {
    const progress = (progressEvent.loaded / progressEvent.total) * 100;
    console.log(progress);
  },
});
```
