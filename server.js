/*Full Stack Web Development Project 
Infinity Motorsports
by mAliz007(github)
*/

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const {Client} = require('pg');
const client = require('./conn'); // This imports your database connection


const app = express();
app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images'); // Save to /images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });


app.get('/cars', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM car WHERE availability_status = True'); // table should exist
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching car data' });
  }
});

app.get('/bikes', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM bike WHERE availability_status= True'); // table should exist
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching car data' });
  }
});

app.get("/bikes/:id", async (req, res) => {
  const bikeId = parseInt(req.params.id);
  try {
    const query = `
      SELECT 
        b.*, 
        w.amount_covered, w.period,
       i.amount_covered AS insurance_amount_covered, i.fee
      FROM 
        bike b
      LEFT JOIN 
        warranty_package w ON b.warranty_package_id = w.package_id
      LEFT JOIN 
        insurance_package i ON b.insurance_package_id = i.package_id
      WHERE 
        b.bike_id = $1
    `;

    const result = await client.query(query, [bikeId]);

    if (result.rows.length > 0) {
      res.json({ data: result.rows[0] });
    } else {
      res.status(404).json({ error: "Bike not found" });
    }
  } catch (err) {
    console.error("Bike fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/cars/:id", async (req, res) => {
  const carId = parseInt(req.params.id);
  try {
    const query = `
      SELECT 
        c.*, 
        w.amount_covered, w.period,
        i.amount_covered AS insurance_amount_covered, i.fee
      FROM 
        car c
      LEFT JOIN 
        warranty_package w ON c.warranty_package_id = w.package_id
      LEFT JOIN 
        insurance_package i ON c.insurance_package_id = i.package_id
      WHERE 
        c.car_id = $1
    `;

    const result = await client.query(query, [carId]);

    if (result.rows.length > 0) {
      res.json({ data: result.rows[0] });
    } else {
      res.status(404).json({ error: "Car not found" });
    }
  } catch (err) {
    console.error("Car fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await client.query(
      "SELECT * FROM customer WHERE email = $1 AND password = $2",
      [email, password]
    );

    if (result.rows.length > 0) {
      res.status(200).json({ message: "Login successful" });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/signup', async (req, res) => {
  try {
    const { cnic, name, address, email, number, password } = req.body;

    await client.query(
      `INSERT INTO customer (cnic, name, address, email, number, password)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cnic, name, address, email, number, password]
    );

    res.status(200).json({ message: "Signup successful!" });

  } catch (err) {
    console.error("Error during signup:", err);

    if (err.code === '23505') {
      res.status(400).json({ message: 'This CNIC or email is already in use!' });
    } else {
      res.status(500).json({ message: "Signup failed" });
    }
  }
});


app.post('/testdrive-bike', async (req, res) => {
  const { email, date, bike_id } = req.body;

  try {
    console.log("Booking test drive for:", email, date, bike_id);

    // Step 1: Find customer ID by email
    const customerResult = await client.query(
      `SELECT customer_id FROM customer WHERE email = $1;`,
      [email]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({ message: "Customer not found. Please sign up first." });
    }

    const customer_id = customerResult.rows[0].customer_id;

    // Step 2: Insert test drive
    await client.query(
      `INSERT INTO test_drive_bike (date, customer_id, bike_id)
       VALUES ($1, $2, $3);`,
      [date, customer_id, bike_id]
    );

    res.status(200).json({ message: "Test drive booked successfully!" });

  } catch (err) {
    console.error("Error during test drive booking:", err);
    res.status(500).json({ error: "Booking failed" });
  }
});

app.post('/testdrive-car', async (req, res) => {
  const { email, date, car_id } = req.body;

  try {
    console.log("Booking test drive for:", email, date, car_id);

    // Step 1: Find customer ID by email
    const customerResult = await client.query(
      `SELECT customer_id FROM customer WHERE email = $1;`,
      [email]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({ message: "Customer not found. Please sign up first." });
    }

    const customer_id = customerResult.rows[0].customer_id;

    // Step 2: Insert test drive
    await client.query(
      `INSERT INTO test_drive_car (date, customer_id, car_id)
       VALUES ($1, $2, $3);`,
      [date, customer_id, car_id]
    );

    res.status(200).json({ message: "Test drive booked successfully!" });

  } catch (err) {
    console.error("Error during test drive booking:", err);
    res.status(500).json({ error: "Booking failed" });
  }
});



// Route to handle bike purchase
app.post('/purchase-bike', async (req, res) => {
  const { bike_id,
    userEmail,
    account,
    currentDate
    } = req.body;

  try {
    const customerQuery= await client.query(
      `SELECT customer_id
       FROM customer
       WHERE email = $1`,
      [userEmail]
    );
    if (customerQuery.rows.length === 0) {
      return res.status(400).json({ error: "Customer not found for given email." });
    }
    const customerID = customerQuery.rows[0]?.customer_id;

    await client.query(
      `INSERT INTO bike_sale (customer_id, bike_id, sale_date, bank_account)
       VALUES ($1, $2, $3, $4)`,
      [customerID, bike_id, currentDate, account]
    );

    // Mark bike as sold
    await client.query(
      `UPDATE bike SET availability_status = false WHERE bike_id = $1`,
      [bike_id]
    );

    res.status(200).json({ message: "Purchase successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Purchase failed" });
  }
});

app.post('/purchase-car', async (req, res) => {
  const { car_id,
    userEmail,
    account,
    currentDate
    } = req.body;

  try {
    const customerQuery= await client.query(
      `SELECT customer_id
       FROM customer
       WHERE email = $1`,
      [userEmail]
    );
    if (customerQuery.rows.length === 0) {
      return res.status(400).json({ error: "Customer not found for given email." });
    }
    const customerID = customerQuery.rows[0]?.customer_id;

    await client.query(
      `INSERT INTO car_sale (customer_id, car_id, sale_date, bank_account)
       VALUES ($1, $2, $3, $4)`,
      [customerID, car_id, currentDate, account]
    );

    // Mark bike as sold
    await client.query(
      `UPDATE car SET availability_status = false WHERE car_id = $1`,
      [car_id]
    );

    res.status(200).json({ message: "Purchase successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Purchase failed" });
  }
});


app.post('/submit-review', async (req, res) => {
  const { userEmail, bike_id, rating, comment } = req.body;

  try {
    const customerResult = await client.query(
      `SELECT customer_id FROM customer WHERE email = $1`,
      [userEmail]
    );

    if (customerResult.rows.length === 0) {
      return res.status(400).json({ error: "Customer not found" });
    }

    const customer_id = customerResult.rows[0].customer_id;

    await client.query(
      `INSERT INTO comment_bike (customer_id, bike_id, rating, comment)
       VALUES ($1, $2, $3, $4)`,
      [customer_id, bike_id, rating, comment]
    );

    res.status(200).json({ message: "Review submitted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

app.post('/submit-review-car', async (req, res) => {
  const { userEmail, car_id, rating, comment } = req.body;

  try {
    const customerResult = await client.query(
      `SELECT customer_id FROM customer WHERE email = $1`,
      [userEmail]
    );

    if (customerResult.rows.length === 0) {
      return res.status(400).json({ error: "Customer not found" });
    }

    const customer_id = customerResult.rows[0].customer_id;

    await client.query(
      `INSERT INTO comment_car (customer_id, car_id, rating, comment)
       VALUES ($1, $2, $3, $4)`,
      [customer_id, car_id, rating, comment]
    );

    res.status(200).json({ message: "Review submitted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

app.get('/api/testimonies', async (req, res) => {
  try {
    const carReviews = await client.query(`
      SELECT 
        c.name AS customer_name,
        car.name AS vehicle_name,
        car.model AS model,
        car.image_url AS image,
        cc.rating,
        cc.comment
      FROM comment_car cc
      JOIN customer c ON cc.customer_id = c.customer_id
      JOIN car ON cc.car_id = car.car_id
    `);

    const bikeReviews = await client.query(`
      SELECT 
        c.name AS customer_name,
        b.name AS vehicle_name,
        b.model AS model,
        b.image_url AS image,
        cb.rating,
        cb.comment
      FROM comment_bike cb
      JOIN customer c ON cb.customer_id = c.customer_id
      JOIN bike b ON cb.bike_id = b.bike_id
    `);
    

    res.status(200).json({
      cars: carReviews.rows,
      bikes: bikeReviews.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch testimonies" });
  }
});

app.post("/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });

  const searchTerm = `%${query}%`;

  try {
    const cars = await client.query(
      `SELECT * FROM car WHERE LOWER(name) LIKE LOWER($1) OR LOWER(model) LIKE LOWER($1)`,
      [searchTerm]
    );
    const bikes = await client.query(
      `SELECT * FROM bike WHERE LOWER(name) LIKE LOWER($1) OR LOWER(model) LIKE LOWER($1)`,
      [searchTerm]
    );

    res.json({
      cars: cars.rows,
      bikes: bikes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/admin-login", async (req, res) => {
  const { id, password } = req.body;

  try {
    const result = await client.query(
      "SELECT * FROM admin WHERE admin_id = $1 AND password = $2",
      [id, password]
    );

    if (result.rows.length > 0) {
      res.status(200).json({ message: "Login successful" });
    } else {
      res.status(401).json({ message: "Invalid Idenitification Number or password" });
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// GET all vehicles (cars + bikes)
app.get('/api/admin-vehicles', async (req, res) => {
  try {
    // Fetch cars data from the database
    const carResults = await client.query(`
      SELECT 
        car_id, 
        'car' AS type,
        name, 
        model, 
        price, 
        image_url 
      FROM car
      WHERE availability_status = true
    `);

    // Fetch bikes data from the database
    const bikeResults = await client.query(`
      SELECT 
        bike_id AS car_id,
        'bike' AS type,
        name, 
        model, 
        price, 
        image_url 
      FROM bike
      WHERE availability_status = true
    `);

    // Send the response with both cars and bikes
    res.status(200).json({
      cars: carResults.rows,
      bikes: bikeResults.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});


app.delete("/api/admin-vehicles/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  console.log("DELETE called with:", { type, id });

  try {
    if (type !== "car" && type !== "bike") {
      return res.status(400).json({ error: "Invalid vehicle type" });
    }

    const table = type === "car" ? "car" : "bike";
    const idColumn = type === "car" ? "car_id" : "bike_id";

    const result = await client.query(`DELETE FROM ${table} WHERE ${idColumn} = $1`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `${type} with id ${id} not found` });
    }

    res.json({ message: `${type} deleted successfully` });
  } catch (err) {
    console.error("DELETE error:", err);
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
});

app.get('/customers', async (req, res) => {
  try {
    const result = await client.query("SELECT cnic, name, email, number, address FROM customer");
    res.json(result.rows); // for PostgreSQL
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to retrieve customers" });
  }
});


app.get('/api/admin-testdrives', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Query for car test drives
    const carTestDrivesQuery = `
      SELECT t.date, c.name AS customer_name, ca.name AS car_name, 'car' AS type
      FROM test_drive_car t
      JOIN customer c ON t.customer_id = c.customer_id
      JOIN car ca ON t.car_id = ca.car_id
      WHERE t.date >= $1
      ORDER BY t.date ASC
    `;
    const carTestDrives = await client.query(carTestDrivesQuery, [today]);

    // Query for bike test drives
    const bikeTestDrivesQuery = `
      SELECT t.date, c.name AS customer_name, b.name AS bike_name, 'bike' AS type
      FROM test_drive_bike t
      JOIN customer c ON t.customer_id = c.customer_id
      JOIN bike b ON t.bike_id = b.bike_id
      WHERE t.date >= $1
      ORDER BY t.date ASC
    `;
    const bikeTestDrives = await client.query(bikeTestDrivesQuery, [today]);

    // Combine car and bike test drives into a single response
    const testDrives = [
      ...carTestDrives.rows.map(drive => ({
        date: drive.date,
        customer_name: drive.customer_name,
        name: drive.car_name,
        type: 'car'
      })),
      ...bikeTestDrives.rows.map(drive => ({
        date: drive.date,
        customer_name: drive.customer_name,
        name: drive.bike_name,
        type: 'bike'
      }))
    ];

    // Sort test drives by date
    testDrives.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Check if we have no test drives
    if (testDrives.length === 0) {
      return res.status(404).json({ message: 'No upcoming test drives found.' });
    }

    res.status(200).json({
      testDrives
    });

  } catch (err) {
    console.error('Error fetching test drives:', err);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});


app.post("/api/add-car", upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      model,
      model_year,
      price,
      engine_capacity,
      registration_number,
      car_description,
      warranty_id,
      insurance_id,
    } = req.body;
    
    const status = 'true';
    const imagePath = `images/${req.file.filename}`;

    await client.query(
      `INSERT INTO car 
        (name, model,model_year, price, engine_capacity, registration_number, car_description, image_url, warranty_package_id, insurance_package_id, availability_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
      [
        name,
        model,
        model_year,
        price,
        engine_capacity,
        registration_number,
        car_description,
        imagePath,
        warranty_id,
        insurance_id,
        status,
      ]
    );

    res.status(200).json({ message: "Car added successfully", imageUrl: imagePath });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error adding car." });
  }
});

app.post("/api/add-bike", upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      model,
      model_year,
      price,
      engine_capacity,
      registration_number,
      description,
      warranty_id,
      insurance_id,
    } = req.body;
    
    const status = 'true';
    const imagePath = `images/${req.file.filename}`;

    await client.query(
      `INSERT INTO bike
        (name, model,model_year, price, engine_capacity, registration_number, description, image_url, warranty_package_id, insurance_package_id, availability_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
      [
        name,
        model,
        model_year,
        price,
        engine_capacity,
        registration_number,
        description,
        imagePath,
        warranty_id,
        insurance_id,
        status,
      ]
    );

    res.status(200).json({ message: "Car added successfully", imageUrl: imagePath });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error adding car." });
  }
});

app.post("/api/add-warranty", async (req, res) => {
  try {
    const { amount_covered, period } = req.body;

    await client.query(
      `INSERT INTO warranty_package(amount_covered, period)
       VALUES ($1, $2)`,
      [amount_covered, period]
    );

    res.status(200).json({ message: "Warranty package added successfully." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error adding warranty package." });
  }
});

app.get("/api/get-warranties", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM warranty_package ORDER BY package_id ASC");
    res.json({ warranties: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error fetching warranties" });
  }
});

app.get('/api/car-sales', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT cs.sale_id, cs.sale_date, cs.bank_account,
             c.car_id, c.name as vehname, c.model, c.price,
             cust.customer_id, cust.name, cust.email
      FROM car_sale cs
      JOIN customer cust ON cs.customer_id = cust.customer_id
      JOIN car c ON cs.car_id = c.car_id
      ORDER BY cs.sale_date DESC
    `);
    res.status(200).json({ sales: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch car sales" });
  }
});


app.get('/api/bike-sales', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT bs.sale_id, bs.sale_date, bs.bank_account,
             b.bike_id, b.name as vehname, b.model, b.price,
             cust.customer_id, cust.name, cust.email
      FROM bike_sale bs
      JOIN customer cust ON bs.customer_id = cust.customer_id
      JOIN bike b ON bs.bike_id = b.bike_id
      ORDER BY bs.sale_date DESC
    `);
    res.status(200).json({ sales: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bike sales" });
  }
});

app.post("/api/add-insurance", async (req, res) => {
  const { amount_covered, fee } = req.body;

 const amountNum = Number(amount_covered);
const feeNum = Number(fee);


  try {
    const result = await client.query(
      `INSERT INTO insurance_package (amount_covered, fee) VALUES ($1, $2) RETURNING *`,
      [amount_covered, fee]
    );

    console.log("Insurance package added: ", result.rows[0]);
    res.status(200).json({ message: "Insurance package added!", data: result.rows[0] });
  } catch (err) {
    // Enhanced error logging for debugging
    console.error("Error adding insurance:", err.message);
    console.error("Error details:", err);  // Logs full error object
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

app.get("/api/get-insurances", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM insurance_package ORDER BY package_id ASC");
    console.log("Fetched insurance packages: ", result.rows);
    res.json({ insurances: result.rows });
  } catch (err) {
    // Enhanced error logging for fetching data
    console.error("Error fetching insurance packages:", err.message);
    console.error("Error details:", err);  // Logs full error object
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Server Listen
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚗 Server is running on http://localhost:${PORT}`);
});
