const router = require('express').Router()
const Population = require('../services/populations')
const User = require('../services/users')
const Unit = require('../services/units')
const Filters = require('../services/filters')
const { updateDatabase } = require('../services/doo_api_database_updater/database_updater')
const { getAssociatedStudyrights } = require('../services/studyrights')

router.get('/v2/populationstatistics/courses', async (req, res) => {
  try {
    if (!req.query.year || !req.query.semester || !req.query.studyRights) {
      res.status(400).json({ error: 'The query should have a year, semester and study rights defined' })
      return
    }
    if (!Array.isArray(req.query.studyRights)) { // studyRights should always be an array
      req.query.studyRights = [req.query.studyRights]
    }

    if (req.query.months == null) {
      req.query.months = 12
    }

    const result = await Population.bottlenecksOf(req.query)
    if (result.error) {
      res.status(400).json(result)
      return
    }

    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e })
  }
})

router.get('/v2/populationstatistics', async (req, res) => {
  try {
    if (!req.query.year || !req.query.semester || !req.query.studyRights) {
      res.status(400).json({ error: 'The query should have a year, semester and study rights defined' })
      return
    }

    if (!Array.isArray(req.query.studyRights)) { // studyRights should always be an array
      req.query.studyRights = [req.query.studyRights]
    }

    if (!req.decodedToken.admin) {
      const user = await User.byUsername(req.decodedToken.userId)
      const elementdetails = await user.getElementdetails()
      const elements = new Set(elementdetails.map(element => element.code))
      if (req.query.studyRights.some(code => !elements.has(code))) {
        res.status(403).json([])
        return
      }
    }

    if (req.query.months == null) {
      req.query.months = 12
    }

    const result = await Population.optimizedStatisticsOf(req.query)
    if (result.error) {
      res.status(400).json(result)
      return
    }

    console.log(`request completed ${new Date()}`)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e })
  }
})
router.get('/v2/populationstatistics/filters', async (req, res) => {

  let results = []
  let rights = req.query.studyRights
  if (!Array.isArray(rights)) { // studyRights should always be an array
    rights = [rights]
  }
  try {
    results = await Filters.findForPopulation(rights)
    res.status(200).json(results)

  } catch (err) {
    console.log(err)
    res.status(400).end()
  }

})
router.post('/v2/populationstatistics/filters', async (req, res) => {
  let results = []
  const filter = req.body

  try {
    results = await Filters.createNewFilter(filter)
    res.status(200).json(results)

  } catch (err) {
    console.log(err)
    res.status(400).end()
  }

})
router.delete('/v2/populationstatistics/filters', async (req, res) => {
  let results = []
  const filter = req.body
  try {
    results = await Filters.deleteFilter(filter)
    res.status(200).json(results)

  } catch (err) {
    console.log(err)
    res.status(400).end()
  }

})

router.post('/updatedatabase', async (req, res) => {
  const studentnumbers = req.body
  console.log(studentnumbers)
  if (studentnumbers) {
    await updateDatabase(studentnumbers, null, true)
    res.status(200).json('Updated')
  } else {
    res.status(400).end()
  }
})

const appendAssociations = (unit, associations) => ({
  ...unit, 
  associations: associations[unit.id]
})

router.get('/studyprogrammes', async (req, res) => {
  try {
    if (!req.decodedToken.admin) {
      const user = await User.byUsername(req.decodedToken.userId)
      const elementdetails = await user.getElementdetails()
      const associations = await getAssociatedStudyrights(elementdetails.map(element => element.code))
      const units = elementdetails.map(element => Unit.parseUnitFromElement(element))
      res.json(units.map(unit => appendAssociations(unit, associations)))
    } else {
      const associations = await getAssociatedStudyrights()
      const units = await Unit.getUnitsFromElementDetails()
      res.json(units.map(unit => appendAssociations(unit, associations)))
    }
  } catch (err) {
    res.status(500).json(err)
  }
})

module.exports = router
