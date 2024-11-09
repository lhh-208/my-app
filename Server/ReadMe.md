# Readme

## 1. 本项目是Nodejs服务后端

技术栈

1. Express服务框架
2. moggonDB

项目启动

```shell
npm run start
https://blog.csdn.net/feixin369/article/details/141205298
mongod --fork -dbpath data --logpath log/mongo.log --logappend
```

数据查询
```shell
mongosh
use map_trace
db.users.find()
```

