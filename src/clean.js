const sequelize = require('./db')

// create db if not exists
sequelize.create().then(() => {
  sequelize.get()
  return Promise.resolve(sequelize.get())
}).then(() => {
  console.log('dropping tables...')
  return sequelize.drop()
}).then(() => {
  console.log('tables dropped and rebuilt.')
  return sequelize.sync(true)
}).then(() => {
  return sequelize.close()
}).catch(error => {
  console.log(error)
})
