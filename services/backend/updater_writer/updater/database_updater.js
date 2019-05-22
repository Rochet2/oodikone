const { sequelize, } = require('../database/connection')

const {
  Student, Credit, Course, CreditTeacher, Teacher,
  Organisation, CourseRealisationType,
  Semester, CreditType, CourseType, Discipline,
  CourseDisciplines, SemesterEnrollment, Provider,
  CourseProvider, Studyright, StudyrightExtent,
  ElementDetails, StudyrightElement, Transfers
} = require('../models/index')
const { updateAttainmentDates } = require('./update_attainment_dates')

const deleteStudentStudyrights = async (studentnumber, transaction) => {
  await Studyright.destroy({
    where: {
      student_studentnumber: studentnumber
    }
  }, { transaction })
  await StudyrightElement.destroy({
    where: {
      studentnumber
    }
  }, { transaction })
}

const updateAttainments = (studyAttainments, transaction) => studyAttainments.map(async ({ credit, creditTeachers, teachers, course }) => {
  try {
    await Promise.all([
      Course.upsert(course, { transaction }),
      Credit.upsert(credit, { transaction }),
    ])
    const { disciplines, providers, courseproviders } = course
    await Promise.all([
      disciplines && disciplines.length > 0 && Promise.all(disciplines.map(courseDiscipline => CourseDisciplines.upsert(courseDiscipline, { transaction }))),
      providers.length > 0 && Promise.all(providers.map(provider => Provider.upsert(provider, { transaction }))),
      courseproviders.length > 0 && Promise.all(courseproviders.map(courseProvider => CourseProvider.upsert(courseProvider, { transaction }))),
      teachers && teachers.length > 0 && Promise.all(teachers.map(teacher => Teacher.upsert(teacher, { transaction }))),
      creditTeachers.length > 0 && Promise.all(creditTeachers.map(cT => CreditTeacher.upsert(cT, { transaction })))
    ])
  } catch (e) {
    console.log(e)
  }
})

const updateStudyRights = (studyRights, transaction) => studyRights.map(async ({ studyRightExtent, studyright, elementDetails, studyRightElements, transfers }) => {
  await Promise.all([
    StudyrightExtent.upsert(studyRightExtent, { transaction }),
    Studyright.create(studyright, { transaction })
  ])
  return Promise.all([
    Promise.all(elementDetails.map(elementdetails => ElementDetails.upsert(elementdetails, { transaction }))),
    Promise.all(studyRightElements.map(StudyRightElement => StudyrightElement.create(StudyRightElement, { transaction }))),
    Promise.all(transfers.map(transfer => Transfers.upsert(transfer, { transaction })))
  ])
})

const updateStudent = async (student) => {
  const { studentInfo, studyAttainments, semesterEnrollments, studyRights } = student
  const transaction = await sequelize.transaction()
  try {
    await deleteStudentStudyrights(studentInfo.studentnumber, transaction) // this needs to be done because Oodi just deletes deprecated studyrights from students ( big yikes )

    await Student.upsert(studentInfo, { transaction })
    try {
    await Promise.all(semesterEnrollments.map(SE =>
      SemesterEnrollment.upsert(SE, { transaction })))
    } catch(e) {
      console.log(e)
      process.kill()
    }
    if (studyAttainments) await Promise.all(updateAttainments(studyAttainments, transaction))

    if (studyRights) await Promise.all(updateStudyRights(studyRights, transaction))

    await transaction.commit()
  } catch (err) {
    console.log(err)
    await transaction.rollback()
  }
}
const updateAttainmentMeta = async () => {
  try {
    await updateAttainmentDates()
  } catch (err) {
    console.log(err)
  }
}

const updateMeta = async ({
  faculties, courseRealisationsTypes,
  semesters, creditTypeCodes, courseTypeCodes,
  disciplines,
}) => {
  const transaction = await sequelize.transaction()

  try {
    await Promise.all([
      Promise.all(courseTypeCodes.map(cT =>
        CourseType.upsert(cT, { transaction })
      )),
      Promise.all(faculties.map(org =>
        Organisation.upsert(org, { transaction })
      )),
      Promise.all(courseRealisationsTypes.map(cR =>
        CourseRealisationType.upsert(cR, { transaction })
      )),
      Promise.all(semesters.map(s =>
        Semester.upsert(s, { transaction })
      )),
      Promise.all(creditTypeCodes.map(cTC =>
        CreditType.upsert(cTC, { transaction })
      )),
      Promise.all(disciplines.map(d =>
        Discipline.upsert(d, { transaction })
      )),
    ])
    await transaction.commit()
  } catch (err) {
    await transaction.rollback()
    console.log(err)
  }

}
module.exports = {
  updateStudent, updateMeta, updateAttainmentMeta
}