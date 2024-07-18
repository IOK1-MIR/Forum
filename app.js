require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./db/connect');
const routes = require('./routes');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { PORT } = process.env;

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Conectar a la base de datos
connectDB();

// Usar rutas
app.use(routes);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const port = PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
