
const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'kitchen.db')

let db = null

// Initialize Database and Server
const initializeDBAndServer = async () => {
  try {
    // Database Connection
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    console.log('Database connected successfully')

    // Enable Foreign Keys
    await db.exec('PRAGMA foreign_keys = ON')

    // =========================
    // DATABASE TABLES
    // =========================

    // Chefs Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chefs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialization TEXT NOT NULL
      )
    `)

    // Stations Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cuisine TEXT NOT NULL,
        station_code TEXT UNIQUE NOT NULL
      )
    `)

    // Bookings Table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chef_id INTEGER,
        station_id INTEGER,
        booking_date TEXT NOT NULL,
        FOREIGN KEY (chef_id) REFERENCES chefs(id),
        FOREIGN KEY (station_id) REFERENCES stations(id)
      )
    `)

    console.log('All database tables created successfully')

    // Verify Tables
    const tables = await db.all(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    `)

    console.log('Database Tables:', tables)

    // =========================
    // HOME AND DATABASE ROUTES
    // =========================

    app.get('/', (request, response) => {
      response.send('KitchenKeys Server Running')
    })

    app.get('/test-db', async (request, response) => {
      const tables = await db.all(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      `)

      response.status(200).send({
        message: 'Database Connected Successfully',
        tables: tables,
      })
    })

    // =========================
    // CHEFS API
    // =========================

    // GET All Chefs
    app.get('/chefs', async (request, response) => {
      const chefs = await db.all(`
        SELECT * FROM chefs
        ORDER BY id
      `)

      response.status(200).send(chefs)
    })

    // GET Chef By ID
    app.get('/chefs/:id', async (request, response) => {
      const {id} = request.params

      const chef = await db.get(
        `SELECT * FROM chefs WHERE id = ?`,
        [id]
      )

      if (chef === undefined) {
        response.status(404).send({
          error: 'Chef not found',
        })
      } else {
        response.status(200).send(chef)
      }
    })

    // POST Add New Chef
    app.post('/chefs', async (request, response) => {
      const {name, specialization} = request.body

      if (
        typeof name !== 'string' ||
        name.trim() === '' ||
        typeof specialization !== 'string' ||
        specialization.trim() === ''
      ) {
        return response.status(400).send({
          error: 'Name and specialization are required',
        })
      }

      const result = await db.run(
        `INSERT INTO chefs (name, specialization)
         VALUES (?, ?)`,
        [name.trim(), specialization.trim()]
      )

      response.status(201).send({
        message: 'Chef added successfully',
        chefId: result.lastID,
      })
    })

    // PUT Update Chef
    app.put('/chefs/:id', async (request, response) => {
      const {id} = request.params
      const {name, specialization} = request.body

      if (
        typeof name !== 'string' ||
        name.trim() === '' ||
        typeof specialization !== 'string' ||
        specialization.trim() === ''
      ) {
        return response.status(400).send({
          error: 'Name and specialization are required',
        })
      }

      const existingChef = await db.get(
        `SELECT * FROM chefs WHERE id = ?`,
        [id]
      )

      if (existingChef === undefined) {
        return response.status(404).send({
          error: 'Chef not found',
        })
      }

      await db.run(
        `UPDATE chefs
         SET name = ?, specialization = ?
         WHERE id = ?`,
        [name.trim(), specialization.trim(), id]
      )

      response.status(200).send({
        message: 'Chef updated successfully',
      })
    })

    // DELETE Chef
    app.delete('/chefs/:id', async (request, response) => {
      const {id} = request.params

      const existingChef = await db.get(
        `SELECT * FROM chefs WHERE id = ?`,
        [id]
      )

      if (existingChef === undefined) {
        return response.status(404).send({
          error: 'Chef not found',
        })
      }

      try {
        await db.run(
          `DELETE FROM chefs WHERE id = ?`,
          [id]
        )

        response.status(200).send({
          message: 'Chef deleted successfully',
        })
      } catch (error) {
        response.status(400).send({
          error: 'Cannot delete chef because bookings exist',
        })
      }
    })

    // =========================
    // STATIONS API
    // =========================

    // GET All Stations with Cuisine Search
    app.get('/stations', async (request, response) => {
      const {cuisine} = request.query

      let stations

      if (cuisine) {
        stations = await db.all(
          `SELECT * FROM stations
           WHERE LOWER(cuisine) = LOWER(?)
           ORDER BY id`,
          [cuisine]
        )
      } else {
        stations = await db.all(`
          SELECT * FROM stations
          ORDER BY id
        `)
      }

      response.status(200).send(stations)
    })

    // GET Station By ID
    app.get('/stations/:id', async (request, response) => {
      const {id} = request.params

      const station = await db.get(
        `SELECT * FROM stations WHERE id = ?`,
        [id]
      )

      if (station === undefined) {
        response.status(404).send({
          error: 'Station not found',
        })
      } else {
        response.status(200).send(station)
      }
    })

    // POST Add New Station
    app.post('/stations', async (request, response) => {
      const {name, cuisine} = request.body

      if (
        typeof name !== 'string' ||
        name.trim() === '' ||
        typeof cuisine !== 'string' ||
        cuisine.trim() === ''
      ) {
        return response.status(400).send({
          error: 'Station name and cuisine are required',
        })
      }

      let transactionStarted = false

      try {
        // Start Transaction
        await db.exec('BEGIN IMMEDIATE')
        transactionStarted = true

        // Get Last Station Sequence
        const sequence = await db.get(`
          SELECT seq
          FROM sqlite_sequence
          WHERE name = 'stations'
        `)

        const nextId = (sequence ? sequence.seq : 0) + 1

        // Generate Automatic Station Code
        const stationCode =
          `STN-${String(nextId).padStart(4, '0')}`

        // Insert Station
        const result = await db.run(
          `INSERT INTO stations
           (name, cuisine, station_code)
           VALUES (?, ?, ?)`,
          [name.trim(), cuisine.trim(), stationCode]
        )

        // Commit Transaction
        await db.exec('COMMIT')
        transactionStarted = false

        response.status(201).send({
          message: 'Station added successfully',
          stationId: result.lastID,
          stationCode: stationCode,
        })
      } catch (error) {
        if (transactionStarted) {
          await db.exec('ROLLBACK')
        }

        response.status(500).send({
          error: error.message,
        })
      }
    })

    // PUT Update Station
    app.put('/stations/:id', async (request, response) => {
      const {id} = request.params
      const {name, cuisine} = request.body

      if (
        typeof name !== 'string' ||
        name.trim() === '' ||
        typeof cuisine !== 'string' ||
        cuisine.trim() === ''
      ) {
        return response.status(400).send({
          error: 'Station name and cuisine are required',
        })
      }

      const existingStation = await db.get(
        `SELECT * FROM stations WHERE id = ?`,
        [id]
      )

      if (existingStation === undefined) {
        return response.status(404).send({
          error: 'Station not found',
        })
      }

      // Update Only Name and Cuisine
      // Station Code Remains Unchanged
      await db.run(
        `UPDATE stations
         SET name = ?, cuisine = ?
         WHERE id = ?`,
        [name.trim(), cuisine.trim(), id]
      )

      response.status(200).send({
        message: 'Station updated successfully',
        stationCode: existingStation.station_code,
      })
    })

    // DELETE Station
    app.delete('/stations/:id', async (request, response) => {
      const {id} = request.params

      const existingStation = await db.get(
        `SELECT * FROM stations WHERE id = ?`,
        [id]
      )

      if (existingStation === undefined) {
        return response.status(404).send({
          error: 'Station not found',
        })
      }

      try {
        await db.run(
          `DELETE FROM stations WHERE id = ?`,
          [id]
        )

        response.status(200).send({
          message: 'Station deleted successfully',
        })
      } catch (error) {
        response.status(400).send({
          error: 'Cannot delete station because bookings exist',
        })
      }
    })

    // =========================
    // BOOKINGS API
    // =========================

    // GET All Bookings with JOIN
    app.get('/bookings', async (request, response) => {
      const bookings = await db.all(`
        SELECT
          bookings.id,
          bookings.chef_id,
          bookings.station_id,
          chefs.name AS chef_name,
          stations.name AS station_name,
          stations.station_code,
          bookings.booking_date
        FROM bookings
        INNER JOIN chefs
          ON bookings.chef_id = chefs.id
        INNER JOIN stations
          ON bookings.station_id = stations.id
        ORDER BY bookings.id
      `)

      response.status(200).send(bookings)
    })

    // GET Booking Details with JOIN
    app.get('/bookings/details', async (request, response) => {
      const bookings = await db.all(`
        SELECT
          bookings.id,
          bookings.chef_id,
          bookings.station_id,
          chefs.name AS chef_name,
          stations.name AS station_name,
          stations.station_code,
          bookings.booking_date
        FROM bookings
        INNER JOIN chefs
          ON bookings.chef_id = chefs.id
        INNER JOIN stations
          ON bookings.station_id = stations.id
      `)

      response.status(200).send(bookings)
    })

    // GET Booking By ID
    app.get('/bookings/:id', async (request, response) => {
      const {id} = request.params

      const booking = await db.get(`
        SELECT
          bookings.id,
          bookings.chef_id,
          bookings.station_id,
          chefs.name AS chef_name,
          stations.name AS station_name,
          stations.station_code,
          bookings.booking_date
        FROM bookings
        INNER JOIN chefs
          ON bookings.chef_id = chefs.id
        INNER JOIN stations
          ON bookings.station_id = stations.id
        WHERE bookings.id = ?
      `, [id])

      if (booking === undefined) {
        response.status(404).send({
          error: 'Booking not found',
        })
      } else {
        response.status(200).send(booking)
      }
    })

    // POST Create New Booking
    app.post('/bookings', async (request, response) => {
      const {chef_id, station_id, booking_date} = request.body

      if (
        !Number.isInteger(chef_id) ||
        !Number.isInteger(station_id) ||
        typeof booking_date !== 'string' ||
        booking_date.trim() === ''
      ) {
        return response.status(400).send({
          error: 'Valid chef_id, station_id and booking_date are required',
        })
      }

      const chef = await db.get(
        `SELECT * FROM chefs WHERE id = ?`,
        [chef_id]
      )

      if (chef === undefined) {
        return response.status(404).send({
          error: 'Chef not found',
        })
      }

      const station = await db.get(
        `SELECT * FROM stations WHERE id = ?`,
        [station_id]
      )

      if (station === undefined) {
        return response.status(404).send({
          error: 'Station not found',
        })
      }

      const result = await db.run(`
        INSERT INTO bookings
        (chef_id, station_id, booking_date)
        VALUES (?, ?, ?)
      `, [chef_id, station_id, booking_date.trim()])

      response.status(201).send({
        message: 'Booking created successfully',
        bookingId: result.lastID,
      })
    })

    // PUT Update Booking
    app.put('/bookings/:id', async (request, response) => {
      const {id} = request.params
      const {chef_id, station_id, booking_date} = request.body

      if (
        !Number.isInteger(chef_id) ||
        !Number.isInteger(station_id) ||
        typeof booking_date !== 'string' ||
        booking_date.trim() === ''
      ) {
        return response.status(400).send({
          error: 'Valid chef_id, station_id and booking_date are required',
        })
      }

      const existingBooking = await db.get(
        `SELECT * FROM bookings WHERE id = ?`,
        [id]
      )

      if (existingBooking === undefined) {
        return response.status(404).send({
          error: 'Booking not found',
        })
      }

      const chef = await db.get(
        `SELECT * FROM chefs WHERE id = ?`,
        [chef_id]
      )

      const station = await db.get(
        `SELECT * FROM stations WHERE id = ?`,
        [station_id]
      )

      if (chef === undefined || station === undefined) {
        return response.status(404).send({
          error: 'Chef or station not found',
        })
      }

      await db.run(`
        UPDATE bookings
        SET chef_id = ?, station_id = ?, booking_date = ?
        WHERE id = ?
      `, [chef_id, station_id, booking_date.trim(), id])

      response.status(200).send({
        message: 'Booking updated successfully',
      })
    })

    // DELETE Booking
    app.delete('/bookings/:id', async (request, response) => {
      const {id} = request.params

      const existingBooking = await db.get(
        `SELECT * FROM bookings WHERE id = ?`,
        [id]
      )

      if (existingBooking === undefined) {
        return response.status(404).send({
          error: 'Booking not found',
        })
      }

      await db.run(
        `DELETE FROM bookings WHERE id = ?`,
        [id]
      )

      response.status(200).send({
        message: 'Booking deleted successfully',
      })
    })

    // =========================
    // START SERVER
    // =========================

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })

  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()
