# School Pickup Management API

A Node.js/Express API for managing school pickup routes, students, and drivers.

## Features

- Student management
- Driver management
- Pickup route management
- Route assignments
- JWT Authentication
- Role-based access control

## Tech Stack

- Backend: Node.js with Express
- Database: PostgreSQL
- Authentication: JWT
- CORS enabled

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://username@localhost:5432/kinder_vervoer_api
JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=3000
```

3. Set up the database:
```bash
psql -U your_username -d kinder_vervoer_api -f src/db/schema.sql
psql -U your_username -d kinder_vervoer_api -f src/db/seeds.sql
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login and get JWT token

### Students
- GET `/api/students` - Get all students
- POST `/api/students` - Create a new student
- PUT `/api/students/:id` - Update a student
- DELETE `/api/students/:id` - Delete a student

### Drivers
- GET `/api/drivers` - Get all drivers
- POST `/api/drivers` - Create a new driver
- PUT `/api/drivers/:id` - Update a driver
- DELETE `/api/drivers/:id` - Delete a driver

### Pickup Routes
- GET `/api/pickup-routes` - Get all routes
- GET `/api/pickup-routes/:id` - Get a specific route
- POST `/api/pickup-routes` - Create a new route
- PUT `/api/pickup-routes/:id` - Update a route
- DELETE `/api/pickup-routes/:id` - Delete a route
- POST `/api/pickup-routes/:id/assignments` - Assign students and driver to a route

## License

MIT
