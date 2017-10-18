const express = require('express')
const cors = require('cors')
const app = express()
const bodyParser = require('body-parser')

const Department = require('./services/departments')
const Student = require('./services/students')
const Course = require('./services/courses')
const Teacher = require('./services/teachers')
const Population = require('./services/populations')

app.use(cors({credentials: true, origin: 'http://localhost:8000'}))
app.use(bodyParser.json())

app.get('/api/departmentsuccess', async function (req, res) {
  const startDate = req.query.date? req.query.date.split('.').join('-'): '2005-08-01'
  const months = 13
  const results = await Department.averagesInMonths(startDate, months)

  res.json(results)
})

app.get('/api/students', async function (req, res) {
  let results = []
  if (req.query.searchTerm) {
    results = await Student.bySeachTerm(req.query.searchTerm)
  }

  res.json(results)
})

app.get('/api/students/:id', async function (req, res) {
  const results = await Student.withId(req.params.id)
  res.json(results)
})

app.get('/api/courses', async function (req, res) {
  let results = []
  if (req.query.name) {
    results = await Course.bySeachTerm(req.query.name)
  }

  res.json(results)
})

app.post('/api/courselist', async function(req, res) {
  const results = await Course.instancesOf(req.body.code)

  res.json(results)
})

app.post('/api/coursestatistics', async function(req, res) {
  const code = req.body.code;
  const date = req.body.date.split('.').join('-')
  const months = req.body.subsequentMonthsToInvestigate

  const results = await Course.statisticsOf(code, date, months)
  res.json(results)
})

app.post('/api/teacherstatistics', async function(req, res) {
  const courses = req.body.courses.map(c => c.code)
  const fromDate = req.body.fromDate.split('.').join('-')
  const toDate = req.body.toDate.split('.').join('-')
  const minCourses = req.body.minCourses || 1
  const minStudents = req.body.minStudents || 1
  const studyRights = req.body.studyRights || 1
  
  const results = await Teacher.statisticsOf(courses, fromDate, toDate, minCourses, minStudents, studyRights)
  res.json(results)
})

app.get('/api/studyrightkeywords', async function(req, res) {
  let results = []
  if (req.query.search) {
    results = await Population.studyrightsByKeyword(req.query.search)
  }

  res.json(results)
})


app.get('/api/enrollmentdates', async function(req, res) {
  const results = await Population.universityEnrolmentDates()
  res.json(results)
})


app.get('*', async function (req, res) {
  const results = { error: "unknown endpoint" }
  res.status(404).json(results)
})

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
})