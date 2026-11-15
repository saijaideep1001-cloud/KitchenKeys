
# KitchenKeys – Kitchen Management Backend

## Project Description

KitchenKeys is a kitchen management backend application developed using Node.js, Express.js and SQLite. It provides REST APIs to manage chefs, cooking stations and bookings.

The application stores information in an SQLite database and allows users to perform CRUD operations through API requests.

## Technologies Used

- Node.js
- Express.js
- SQLite
- JavaScript
- Postman
- Git and GitHub

## Project Features

- Database creation and connection using SQLite.
- Chef management (Create, Read, Update and Delete).
- Cooking station management.
- Automatic station code generation.
- Booking management.
- SQL JOIN to retrieve combined booking information.
- REST API testing using Postman.

## Database Structure

The project contains three database tables:

### 1. Chefs

Stores chef information.

- id
- name
- specialization

### 2. Stations

Stores cooking station information.

- id
- name
- cuisine
- station_code

### 3. Bookings

Stores booking information.

- id
- chef_id
- station_id
- booking_date

## API Endpoints

Base URL: `http://localhost:3000`

### Database

| Method | Endpoint | Description |
|---|---|---|
| GET | /test-db | Test database connection |

### Chefs

| Method | Endpoint | Description |
|---|---|---|
| GET | /chefs | Get all chefs |
| GET | /chefs/:id | Get a chef by ID |
| POST | /chefs | Add a new chef |
| PUT | /chefs/:id | Update chef details |
| DELETE | /chefs/:id | Delete a chef |

### Stations

| Method | Endpoint | Description |
|---|---|---|
| GET | /stations | Get all stations |
| GET | /stations/:id | Get a station by ID |
| POST | /stations | Add a new station |
| PUT | /stations/:id | Update station details |
| DELETE | /stations/:id | Delete a station |

### Bookings

| Method | Endpoint | Description |
|---|---|---|
| GET | /bookings | Get all bookings |
| GET | /bookings/:id | Get a booking by ID |
| POST | /bookings | Create a booking |
| PUT | /bookings/:id | Update a booking |
| DELETE | /bookings/:id | Delete a booking |

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/saijaideep1001-cloud/KitchenKeys.git
```

### 2. Open the project folder

```bash
cd KitchenKeys
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the application

```bash
npm run dev
```

The server will run at:

`http://localhost:3000`

## API Testing

Postman is used to test the REST API endpoints.

The Postman collection is available in the `postman` folder.

It contains requests for testing the Chefs, Stations and Bookings APIs.

## SQL JOIN

The application uses SQL JOIN to retrieve booking information along with the associated chef and cooking station details.

This helps retrieve related information from multiple database tables in a single API response.

## GitHub Repository

https://github.com/saijaideep1001-cloud/KitchenKeys

## Author

Sai Jai Deep
