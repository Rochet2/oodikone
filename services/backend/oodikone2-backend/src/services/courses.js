const Sequelize = require('sequelize')
const moment = require('moment')
const {
  sequelize,
  Student,
  Credit,
  Course,
  CourseType,
  Discipline,
  ElementDetails,
  StudyrightElement,
  Studyright,
  Semester
} = require('../models')
const { sequelizeKone, CourseDuplicates } = require('../models/models_kone')
const Op = Sequelize.Op
const { CourseYearlyStatsCounter } = require('../services/course_yearly_stats_counter')
const _ = require('lodash')

const byNameOrCode = (searchTerm, language) =>
  Course.findAll({
    where: {
      [Op.or]: [
        {
          name: {
            [language]: {
              [Op.iLike]: searchTerm
            }
          }
        },
        {
          code: {
            [Op.like]: searchTerm
          }
        }
      ]
    }
  })

const byName = (name, language) =>
  Course.findAll({
    where: {
      name: {
        [language]: {
          [Op.eq]: name
        }
      }
    },
    order: [['latest_instance_date', 'DESC']],
    limit: 1
  })

const byNameOrCodeTypeAndDiscipline = (searchTerm, type, discipline, language) => {
  const includeDiscipline = discipline
    ? {
        include: {
          model: Discipline,
          where: {
            discipline_id: {
              [Op.eq]: discipline
            }
          }
        }
      }
    : null

  const whereNameOrCode = searchTerm
    ? {
        [Op.or]: [
          {
            name: {
              [language]: {
                [Op.iLike]: `%${searchTerm}%`
              }
            }
          },
          {
            code: {
              [Op.iLike]: `%${searchTerm}%`
            }
          }
        ]
      }
    : null

  const whereType = type
    ? {
        [Op.and]: [
          {
            coursetypecode: {
              [Op.eq]: type
            }
          }
        ]
      }
    : null

  return Course.findAll({
    ...includeDiscipline,
    where: {
      ...whereNameOrCode,
      ...whereType
    }
  })
}

const byCode = code => Course.findByPk(code)

const creditsForCourses = codes =>
  Credit.findAll({
    include: [
      {
        model: Student,
        attributes: ['studentnumber'],
        include: {
          model: StudyrightElement,
          attributes: ['code', 'startdate'],
          include: [
            {
              model: ElementDetails,
              attributes: ['name', 'type'],
              where: {
                type: {
                  [Op.eq]: 20
                }
              }
            },
            {
              model: Studyright,
              attributes: ['prioritycode'],
              where: {
                prioritycode: {
                  [Op.eq]: 1
                }
              }
            }
          ]
        }
      },
      {
        model: Semester,
        attributes: ['semestercode', 'name', 'yearcode', 'yearname']
      }
    ],
    where: {
      course_code: {
        [Op.in]: codes
      }
    },
    order: [['attainment_date', 'ASC']]
  })

const bySearchTerm = async (term, language) => {
  const formatCourse = course => ({
    name: course.name[language],
    code: course.code,
    date: course.latest_instance_date
  })

  try {
    const result = await byNameOrCode(`%${term}%`, language)
    return result.map(formatCourse)
  } catch (e) {
    return {
      error: e
    }
  }
}

const bySearchTermTypeAndDiscipline = async (term, type, discipline, language) => {
  const formatCourse = course => ({
    name: course.name[language],
    code: course.code,
    date: course.latest_instance_date
  })
  const removeDuplicates = courses => {
    let newList = []
    courses.map(course => {
      const nameDuplicates = courses.filter(c => course.name === c.name)
      if (nameDuplicates.length === 1 || !newList.find(c => c.name === course.name)) {
        newList.push(course)
      }
      newList = newList.map(cor => {
        if (cor.name === course.name) {
          return cor.date > course.date ? cor : course
        }
        return cor
      })
    })
    return newList
  }
  try {
    const result = await byNameOrCodeTypeAndDiscipline(term, type, discipline, language)
    return removeDuplicates(result.map(formatCourse))
  } catch (e) {
    return {
      error: e
    }
  }
}

const creditsOf = async codes => {
  const formatCredit = credit => {
    const credits = [credit]
    return {
      id: credit.id,
      date: credit.attainment_date,
      credits,
      fail: credits.filter(Credit.failed).length,
      pass: credits.filter(Credit.passed).length,
      students: credits.length,
      studentnumbers: credits.map(cr => cr.student_studentnumber)
    }
  }

  try {
    const credits = await creditsForCourses(codes)
    return credits.map(formatCredit)
  } catch (e) {
    console.log(e)
    return {
      error: e
    }
  }
}

const oneYearStats = (instances, year, separate, allInstancesUntilYear) => {
  const calculateStats = (thisSemester, allInstancesUntilSemester) => {
    const studentsThatPassedThisYear = _.uniq(
      _.flattenDeep(thisSemester.map(inst => inst.credits.filter(Credit.passed).map(c => c.student)))
    )

    const gradeDistribution = _.groupBy(_.uniq(_.flattenDeep(thisSemester.map(inst => inst.credits))), 'grade')

    const studentsThatFailedThisYear = _.uniq(
      _.flattenDeep(thisSemester.map(inst => inst.credits.filter(Credit.failed).map(c => c.student)))
    )

    const allStudentsThatFailedEver = _.flattenDeep(
      allInstancesUntilSemester.map(inst => inst.credits.filter(Credit.failed).map(c => c.student))
    )

    const passedStudentsThatFailedBefore = _.uniq(
      studentsThatPassedThisYear.filter(student =>
        allStudentsThatFailedEver.map(s => s.studentnumber).includes(student.studentnumber)
      )
    )

    const passedStudentsOnFirstTry = _.difference(studentsThatPassedThisYear, passedStudentsThatFailedBefore)
    const failedStudentsThatFailedBefore = _.uniq(
      _.flattenDeep(
        studentsThatFailedThisYear.filter(student =>
          Object.entries(_.countBy(allStudentsThatFailedEver, 'studentnumber')).some(
            ([number, count]) => number === student.studentnumber && count > 1
          )
        )
      )
    )

    const failedStudentsOnFirstTry = _.difference(studentsThatFailedThisYear, failedStudentsThatFailedBefore)

    return {
      studentsThatPassedThisYear,
      studentsThatFailedThisYear,
      allStudentsThatFailedEver,
      passedStudentsThatFailedBefore,
      passedStudentsOnFirstTry,
      failedStudentsThatFailedBefore,
      failedStudentsOnFirstTry,
      gradeDistribution,
      studentnumbers: thisSemester.studentnumbers
    }
  }
  const stats = []
  if (separate === 'true') {
    const fallInstances = instances.filter(inst =>
      moment(inst.date).isBetween(String(year) + '-08-01', String(year + 1) + '-01-15')
    )

    const allInstancesUntilFall = allInstancesUntilYear.filter(inst =>
      moment(inst.date).isBefore(String(year + 1) + '-01-15')
    )

    const springInstances = instances.filter(inst =>
      moment(inst.date).isBetween(String(year + 1) + '-01-15', String(year + 1) + '-08-01')
    )

    let fallStatistics = calculateStats(fallInstances, allInstancesUntilFall)

    let springStatistics = calculateStats(springInstances, allInstancesUntilYear)

    const passedF = fallInstances.reduce((a, b) => (b.pass ? (a = a.concat(b.credits[0].student)) : a), [])
    const failedF = fallInstances.reduce((a, b) => (b.fail ? (a = a.concat(b.credits[0].student)) : a), [])

    const passedS = springInstances.reduce((a, b) => (b.pass ? (a = a.concat(b.credits[0].student)) : a), [])
    const failedS = springInstances.reduce((a, b) => (b.fail ? (a = a.concat(b.credits[0].student)) : a), [])

    if (fallStatistics.studentsThatPassedThisYear.length + fallStatistics.studentsThatFailedThisYear.length > 0) {
      stats.push({
        studentsThatPassedThisYear: fallStatistics.studentsThatPassedThisYear || 0,
        studentsThatFailedThisYear: fallStatistics.studentsThatFailedThisYear || 0,
        passedStudentsThatFailedBefore: fallStatistics.passedStudentsThatFailedBefore || 0,
        passedStudentsOnFirstTry: fallStatistics.passedStudentsOnFirstTry || 0,
        failedStudentsThatFailedBefore: fallStatistics.failedStudentsThatFailedBefore || 0,
        failedStudentsOnFirstTry: fallStatistics.failedStudentsOnFirstTry || 0,
        courseLevelPassed: passedF,
        courseLevelFailed: failedF,
        gradeDistribution: fallStatistics.gradeDistribution,
        time: String(year) + ' Fall'
      })
    }
    if (springStatistics.studentsThatPassedThisYear.length + springStatistics.studentsThatFailedThisYear.length > 0) {
      stats.push({
        studentsThatPassedThisYear: springStatistics.studentsThatPassedThisYear || 0,
        studentsThatFailedThisYear: springStatistics.studentsThatFailedThisYear || 0,
        passedStudentsThatFailedBefore: springStatistics.passedStudentsThatFailedBefore || 0,
        passedStudentsOnFirstTry: springStatistics.passedStudentsOnFirstTry || 0,
        failedStudentsThatFailedBefore: springStatistics.failedStudentsThatFailedBefore || 0,
        failedStudentsOnFirstTry: springStatistics.failedStudentsOnFirstTry || 0,
        courseLevelPassed: passedS,
        courseLevelFailed: failedS,
        gradeDistribution: springStatistics.gradeDistribution,
        time: String(year + 1) + ' Spring'
      })
    }
  } else {
    const yearInst = instances.filter(inst =>
      moment(inst.date).isBetween(String(year) + '-08-01', String(year + 1) + '-08-01')
    )

    let statistics = calculateStats(yearInst, allInstancesUntilYear)
    const passed = yearInst.reduce((a, b) => (b.pass ? (a = a.concat(b.credits[0].student)) : a), [])
    const failed = yearInst.reduce((a, b) => (b.fail ? (a = a.concat(b.credits[0].student)) : a), [])

    stats.push({
      studentsThatPassedThisYear: statistics.studentsThatPassedThisYear || 0,
      studentsThatFailedThisYear: statistics.studentsThatFailedThisYear || 0,
      passedStudentsThatFailedBefore: statistics.passedStudentsThatFailedBefore || 0,
      passedStudentsOnFirstTry: statistics.passedStudentsOnFirstTry || 0,
      failedStudentsThatFailedBefore: statistics.failedStudentsThatFailedBefore || 0,
      failedStudentsOnFirstTry: statistics.failedStudentsOnFirstTry || 0,
      courseLevelPassed: passed,
      courseLevelFailed: failed,
      gradeDistribution: statistics.gradeDistribution,
      time: String(year) + '-' + String(year + 1)
    })
  }

  return stats
}

const yearlyStatsOf = async (code, year, separate, language) => {
  const getProgrammesFromStats = stats =>
    _.flattenDeep(
      stats.map(year =>
        _.union(year.courseLevelPassed, year.courseLevelFailed).map(s => s.studyright_elements.map(e => e))
      )
    ).reduce((b, a) => {
      if (b[a.code]) {
        b[a.code].amount++
      } else {
        b[a.code] = { name: a.element_detail.name, amount: 1 }
      }
      return b
    }, resultProgrammes)

  const codes = await alternativeCodes(code)
  const allInstances = await creditsOf(codes)
  const yearInst = allInstances.filter(inst =>
    moment(new Date(inst.date)).isBetween(year.start + '-09-01', year.end + '-08-01')
  )

  const allInstancesUntilYear = allInstances.filter(inst => moment(new Date(inst.date)).isBefore(year.end + '-08-01'))
  const name = (await Course.findOne({ where: { code: { [Op.eq]: code } } })).dataValues.name[language]
  const start = Number(year.start)
  const end = Number(year.end)
  const resultStats = []
  let resultProgrammes = {}
  let stats
  if (yearInst) {
    for (let year = start; year < end; year++) {
      stats = oneYearStats(yearInst, year, separate, allInstancesUntilYear)
      if (stats.length > 0) {
        resultStats.push(...stats)
        resultProgrammes = getProgrammesFromStats(stats)
      }
    }
    return {
      code,
      alternativeCodes: codes.filter(cd => cd !== code),
      start,
      end,
      separate,
      stats: resultStats,
      programmes: resultProgrammes,
      name
    }
  }
  return
}

const createCourse = async (code, name, latest_instance_date) =>
  Course.create({
    code,
    name,
    latest_instance_date
  })

const findDuplicates = async (oldPrefixes, newPrefixes) => {
  let oldPrefixQuery = ''
  let newPrefixQuery = ''
  oldPrefixes.forEach(prefix => {
    oldPrefixQuery += `ou.code like '${prefix}%' OR\n`
  })
  oldPrefixQuery = oldPrefixQuery.slice(0, -4)

  newPrefixes.forEach(prefix => {
    newPrefixQuery += `inr.code like '${prefix}%' OR\n`
  })

  newPrefixQuery = newPrefixQuery.slice(0, -4)

  return sequelize.query(`select ou.code as code1,  inr.code as code2, ou.name from course ou
  inner join course inr on
  (
    select count(*) from course inr
  where inr.name = ou.name) > 1
   AND inr.name = ou.name
   where(
    (${oldPrefixQuery})
    AND (${newPrefixQuery})
    AND ou.name->>'fi' not like 'Kandidaatin%'
    AND ou.name->>'fi' not like 'Muualla suoritetut%'
    AND ou.name->>'fi' not like 'Tutkimusharjoittelu%'
    AND ou.name->>'fi' not like 'Väitöskirja%'
    AND ou.name->>'fi' not like '%erusopinnot%'
    AND ou.name->>'fi' not like '%ineopinnot%'
    AND ou.name->>'fi' not like '%Pro gradu -tutkielma%'
  )
  order by name`)
}

const getMainCodes = () => {
  return CourseDuplicates.findAll()
}

const deleteDuplicateCode = async code => {
  try {
    await CourseDuplicates.destroy({
      where: {
        coursecode: code
      }
    })
    await sequelizeKone.query(
      `DELETE FROM course_duplicates
      WHERE groupid in ( SELECT groupid FROM course_duplicates
      group by groupid
      having count(*) = 1)`,
      { type: sequelize.QueryTypes.BULKDELETE }
    )
  } catch (e) {
    console.error(e)
  }
}

const getDuplicateCodesWithCourses = async () => {
  const courseDuplicates = await CourseDuplicates.findAll()
  const courses = await Course.findAll({
    where: {
      code: {
        [Op.in]: courseDuplicates.map(e => e.coursecode)
      }
    }
  })
  const codeToCourse = courses.reduce((acc, c) => {
    acc[c.code] = c
    return acc
  }, {})
  return courseDuplicates.map(cd => ({ ...cd.get(), course: codeToCourse[cd.coursecode] }))
}

const getDuplicatesToIdMap = () => {
  return getMainCodes().then(res =>
    res.reduce((acc, e) => {
      acc[e.coursecode] = e.groupid
      return acc
    }, {})
  )
}

const getIdToDuplicatesMapWithCourse = () => {
  return getDuplicateCodesWithCourses().then(res =>
    res.reduce((acc, e) => {
      if (!e.course) return acc
      acc[e.groupid] = acc[e.groupid] || []
      acc[e.groupid].push(e.course)
      return acc
    }, {})
  )
}

const getMainCodeToDuplicates = async () => {
  const all = await getIdToDuplicatesMapWithCourse()
  const maincodeToDuplicates = Object.values(all).reduce((acc, courses) => {
    const main = _.orderBy(
      courses,
      [
        c => {
          if (c.code.match(/^A/)) return 4 // open university codes come last
          if (c.code.match(/^\d/)) return 2 // old numeric codes come second
          if (c.code.match(/^[A-Za-z]/)) return 1 // new letter based codes come first
          return 3 // unknown, comes before open uni?
        },
        c => c.latest_instance_date || new Date(),
        'code'
      ],
      ['asc', 'desc', 'desc']
    )[0]
    acc[main.code] = {
      maincourse: { code: main.code, name: main.name },
      duplicates: courses.map(c => ({ code: c.code, name: c.name }))
    }
    return acc
  }, {})
  return maincodeToDuplicates
}

const getCodeToMainCourseMap = async () => {
  try {
    const maincodeToDuplicates = await getMainCodeToDuplicates()
    const codeToMainCode = Object.values(maincodeToDuplicates).reduce((acc, d) => {
      d.duplicates.forEach(c => {
        acc[c.code] = d.maincourse
      })
      return acc
    }, {})
    return codeToMainCode
  } catch (e) {
    console.error(e)
  }
  return {}
}

const getMainCodeToDuplicatesAndCodeToMainCode = async () => {
  return [await getMainCodeToDuplicates(), await getCodeToMainCourseMap()]
}

const getMainCourseToCourseMap = async (/*programme*/) => {
  try {
    const codeToMainCodeMap = await getCodeToMainCourseMap()
    const courses = await byCodes(Object.keys(codeToMainCodeMap))
    const mainCodeToCoursesMap = courses.reduce((acc, course) => {
      const maincourse = codeToMainCodeMap[course.code]
      const duplicates = acc[maincourse.code] || []
      duplicates.push(course)
      acc[maincourse.code] = duplicates
      return acc
    }, {})
    return mainCodeToCoursesMap
  } catch (e) {
    console.error(e)
  }
  return {}
}

const getDuplicateCodes = async code => {
  const [mainCodeToDuplicates, codeToMainCourseMap] = await getMainCodeToDuplicatesAndCodeToMainCode()
  const maincourse = codeToMainCourseMap[code]
  if (!maincourse) return null
  return mainCodeToDuplicates[maincourse.code].duplicates.map(e => e.code)
}

const setDuplicateCode = async (code1, code2) => {
  if (code1 !== code2) {
    try {
      const course1 = await byCode(code1)
      const course2 = await byCode(code2)
      if (course1 && course2) {
        const all = await getDuplicatesToIdMap()
        // make sure both dont have a group
        if ([all[code1], all[code2]].filter(e => e).length <= 1) {
          let groupid = all[code1] || all[code2]
          if (!groupid) {
            // neither has a group, make one
            groupid = Math.max(0, ...Object.values(all).filter(e => e))
            groupid = groupid && !isNaN(groupid) ? groupid + 1 : 1
          }
          await CourseDuplicates.bulkCreate([{ groupid, coursecode: code1 }, { groupid, coursecode: code2 }], {
            ignoreDuplicates: true
          })
        } else {
          // both have a group, must merge groups
          await CourseDuplicates.update({ groupid: all[code1] }, { where: { groupid: all[code2] } })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
}

const getAllCourseTypes = () => CourseType.findAll()
const getAllDisciplines = () => Discipline.findAll()

const alternativeCodes = async code => {
  const alternatives = await getDuplicateCodes(code)
  return alternatives ? alternatives : [code]
}

const getGroupId = async code => {
  const duplicates = await CourseDuplicates.findOne({
    where: {
      coursecode: code
    }
  })
  return duplicates ? duplicates.groupid : code
}

const formatStudyrightElement = ({ code, element_detail, startdate }) => ({
  code,
  name: element_detail.name,
  startdate
})

const parseCredit = credit => {
  const { student, semester, grade, course_code } = credit
  const { studentnumber, studyright_elements: elements } = student
  const { yearcode, yearname, semestercode, name: semestername } = semester
  return {
    student,
    yearcode,
    yearname,
    semestercode,
    semestername,
    coursecode: course_code,
    grade,
    passed: !Credit.failed(credit) || Credit.passed(credit) || Credit.improved(credit),
    studentnumber,
    programmes: elements.map(formatStudyrightElement)
  }
}

const yearlyStatsOfNew = async (coursecode, separate, unifyOpenUniCourses) => {
  const codes = await alternativeCodes(coursecode)

  if (unifyOpenUniCourses) {
    const nonOpenUniCodes = _.uniq(codes.map(unifyOpenUniversity))

    const matchingOpenUniCourseCodes = nonOpenUniCodes.length
      ? await Course.findAll({
          where: {
            code: {
              [Op.regexp]: {
                [Op.any]: nonOpenUniCodes.map(c => `^AY?${c}(en|fi|sv)?$`)
              }
            }
          }
        }).map(course => course.code)
      : []

    codes.push(...matchingOpenUniCourseCodes)
  }

  const uniqueCodes = _.uniq(codes)
  const [credits, course] = await Promise.all([creditsForCourses(uniqueCodes), Course.findByPk(coursecode)])
  const counter = new CourseYearlyStatsCounter()
  for (let credit of credits) {
    const {
      studentnumber,
      grade,
      passed,
      semestercode,
      semestername,
      yearcode,
      yearname,
      programmes,
      coursecode
    } = parseCredit(credit)
    const groupcode = separate ? semestercode : yearcode
    const groupname = separate ? semestername : yearname
    const unknownProgramme = [
      {
        code: 'OTHER',
        name: {
          en: 'Other',
          fi: 'Muu',
          sv: 'Andra'
        }
      }
    ]
    counter.markStudyProgrammes(studentnumber, programmes.length === 0 ? unknownProgramme : programmes, yearcode)
    counter.markCreditToGroup(studentnumber, passed, grade, groupcode, groupname, coursecode, yearcode)
    counter.markCreditToHistory(studentnumber, passed)
  }
  const statistics = counter.getFinalStatistics()
  return {
    ...statistics,
    coursecode,
    alternatives: uniqueCodes,
    name: course.name.fi
  }
}

const maxYearsToCreatePopulationFrom = async coursecodes => {
  const maxAttainmentDate = new Date(
    Math.max(
      ...(await Course.findAll({
        where: {
          code: {
            [Op.in]: coursecodes
          }
        },
        attributes: ['max_attainment_date']
      }).map(c => new Date(c.max_attainment_date).getTime()))
    )
  )
  const attainmentThreshold = new Date(maxAttainmentDate.getFullYear(), 0, 1)
  attainmentThreshold.setFullYear(attainmentThreshold.getFullYear() - 6)

  const credits = await Credit.findAll({
    where: {
      course_code: {
        [Op.in]: coursecodes
      },
      attainment_date: {
        [Op.gt]: attainmentThreshold
      }
    },
    order: [['attainment_date', 'ASC']]
  })

  const yearlyStudents = Object.values(
    credits.reduce((res, credit) => {
      const attainmentYear = new Date(credit.attainment_date).getFullYear()
      if (!res[attainmentYear]) res[attainmentYear] = 0
      res[attainmentYear]++
      return res
    }, {})
  )
  const maxYearsToCreatePopulationFrom = Math.max(
    Math.floor(
      1200 / // Lower this value to get a smaller result if necessary
        (yearlyStudents.reduce((acc, curr) => acc + curr, 0) / yearlyStudents.length)
    ),
    1
  )

  return maxYearsToCreatePopulationFrom
}

const courseYearlyStats = async (coursecodes, separate, unifyOpenUniCourses) => {
  const stats = await Promise.all(coursecodes.map(code => yearlyStatsOfNew(code, separate, unifyOpenUniCourses)))
  return stats
}

const nameLikeTerm = name => {
  if (!name) {
    return undefined
  }
  const term = `%${name.trim()}%`
  return {
    name: {
      [Op.or]: {
        fi: {
          [Op.iLike]: term
        },
        sv: {
          [Op.iLike]: term
        },
        en: {
          [Op.iLike]: term
        }
      }
    }
  }
}

const codeLikeTerm = code =>
  !code
    ? undefined
    : {
        code: {
          [Op.iLike]: `%${code.trim()}%`
        }
      }

const isOpenUniCourseCode = code => code.match(/^AY?(.+?)(?:en|fi|sv)?$/)

const unifyOpenUniversity = code => {
  const regexresult = isOpenUniCourseCode(code)
  if (!regexresult) return code
  return regexresult[1]
}

const byNameAndOrCodeLike = async (name, code) => {
  const courses = await Course.findAll({
    attributes: [
      'name',
      'code',
      ['latest_instance_date', 'date'],
      'startdate',
      'enddate',
      'max_attainment_date',
      'min_attainment_date'
    ],
    where: {
      ...nameLikeTerm(name),
      ...codeLikeTerm(code)
    }
  })

  const groups = {}
  const groupMeta = {}
  const codeToMainCourseMap = await getCodeToMainCourseMap()
  await Promise.all(
    courses.map(
      course =>
        new Promise(async res => {
          const formattedCode = unifyOpenUniversity(course.code)
          const groupid = await getGroupId(formattedCode)
          groups[course.code] = groupid
          if (!groupMeta[groupid]) {
            const mainCourse = codeToMainCourseMap[formattedCode]
            if ((mainCourse && !isOpenUniCourseCode(course.code)) || !isOpenUniCourseCode(course.code)) {
              groupMeta[groupid] = {
                name: mainCourse ? mainCourse.name : course.name,
                code: mainCourse ? mainCourse.code : course.code
              }
            }
          }
          res()
        })
    )
  )

  return { courses, groups, groupMeta }
}

const byCodes = codes => {
  return Course.findAll({
    where: {
      code: {
        [Op.in]: codes
      }
    }
  })
}

module.exports = {
  byCode,
  byName,
  bySearchTerm,
  bySearchTermTypeAndDiscipline,
  createCourse,
  yearlyStatsOf,
  findDuplicates,
  setDuplicateCode,
  deleteDuplicateCode,
  getCodeToMainCourseMap,
  getMainCourseToCourseMap,
  getAllCourseTypes,
  getAllDisciplines,
  yearlyStatsOfNew,
  courseYearlyStats,
  byNameAndOrCodeLike,
  byCodes,
  getMainCodeToDuplicatesAndCodeToMainCode,
  maxYearsToCreatePopulationFrom,
  unifyOpenUniversity
}
