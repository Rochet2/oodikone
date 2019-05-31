const Schedule = require('../models')

const getOldestTasks = async () => {
  const oldestTask = await Schedule.find({ type: 'student' }).sort({ updatedAt: 1 }).limit(1)
  const oldestActiveTask = await Schedule.find({ type: 'student', active: true, status: 'DONE' }).sort({ updatedAt: 1 }).limit(1)

  return {
    oldestChangedStatus: { studentnumber: oldestTask.task, updatedAt: oldestTask.updatedAt }, oldestActiveStudentDone: { studentnumber: oldestActiveTask.task, updatedAt: oldestActiveTask.updatedAt }
  }
}
const getCurrentStatus = async () => {
  const allTasksScheduled = await Schedule.find({ type: 'student', status: 'SCHEDULED' })
  const allTasksFetched = await Schedule.find({ type: 'student', status: 'FETCHED' })
  const allTasksDone = await Schedule.find({ type: 'student', status: 'DONE' })

  return { allTasksScheduled: allTasksScheduled.length, allTasksFetched: allTasksFetched.length, allTasksDone: allTasksDone.length }
}

module.exports = { getOldestTasks, getCurrentStatus }