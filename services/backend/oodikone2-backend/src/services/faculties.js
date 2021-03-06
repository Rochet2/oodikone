const axios = require('axios')
const moment = require('moment')
const AsyncLock = require('async-lock')
const { USERSERVICE_URL } = require('../conf-backend')
const { Credit, StudyrightElement } = require('../models')

const client = axios.create({ baseURL: USERSERVICE_URL, headers: { secret: process.env.USERSERVICE_SECRET } })

const calculateFacultyYearlyStats = async () => {
  const { data: facultyProgrammes } = await client.get('/faculty_programmes')
  const res = {}
  const studentSets = {}
  const lock = new AsyncLock()

  let amountDone = 0
  await Promise.all(
    facultyProgrammes.map(
      ({ faculty_code, programme_code }) =>
        new Promise(async facultyRes => {
          if (!res[faculty_code]) {
            res[faculty_code] = {}
            studentSets[faculty_code] = {}
          }
          if (!res[faculty_code][programme_code]) {
            res[faculty_code][programme_code] = {}
            studentSets[faculty_code][programme_code] = {}
          }

          const facultyStudents = await StudyrightElement.findAll({
            where: {
              code: programme_code
            },
            attributes: ['studentnumber']
          })

          await Promise.all(
            facultyStudents.map(
              student =>
                new Promise(async studentRes => {
                  const filteredStudentCredits = await Credit.findAll({
                    where: {
                      student_studentnumber: student.studentnumber,
                      credittypecode: [4, 10],
                      isStudyModule: false
                    }
                  })

                  filteredStudentCredits.forEach(c => {
                    const attainmentYear = moment(c.attainment_date).year()
                    if (!res[faculty_code][attainmentYear]) {
                      lock.acquire(faculty_code, done => {
                        if (!res[faculty_code][programme_code][attainmentYear]) {
                          const facultyYearStats = {}
                          facultyYearStats.studentCredits = 0
                          facultyYearStats.coursesPassed = 0
                          facultyYearStats.coursesFailed = 0
                          facultyYearStats.students = 0
                          res[faculty_code][programme_code][attainmentYear] = facultyYearStats
                          studentSets[faculty_code][programme_code][attainmentYear] = new Set()
                        }
                        done()
                      })
                    }
                    const facultyYearStats = res[faculty_code][programme_code][attainmentYear]
                    const studentSet = studentSets[faculty_code][programme_code][attainmentYear]
                    if (!studentSet.has(c.student_studentnumber)) {
                      facultyYearStats.students++
                      studentSet.add(c.student_studentnumber)
                    }
                    if (c.credittypecode === 4) {
                      facultyYearStats.studentCredits += c.credits
                      facultyYearStats.coursesPassed += 1
                    } else {
                      facultyYearStats.coursesFailed += 1
                    }
                  })
                  studentRes()
                })
            )
          )
          amountDone += 1
          console.log(`Faculty programmes done ${amountDone}/${facultyProgrammes.length}`)
          facultyRes()
        })
    )
  )
  return res
}

module.exports = {
  calculateFacultyYearlyStats
}
