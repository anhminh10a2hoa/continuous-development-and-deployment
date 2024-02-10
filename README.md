# Project

### Run the project


```bash
docker-compose up --build
```

### Here is the output of the project

```bash
service1     | Consuming state-service1 messages
monitor      | Monitor running on port 8002
rabbitmq     | 2024-01-30 22:18:28.463678+00:00 [info] <0.582.0> accepting AMQP connection <0.582.0> (172.26.0.5:42088 -> 172.26.0.2:5672)
rabbitmq     | 2024-01-30 22:18:28.511529+00:00 [info] <0.582.0> connection <0.582.0> (172.26.0.5:42088 -> 172.26.0.2:5672): user 'minhhoang' authenticated and granted access to vhost '/'
monitor      | Consuming log
api-gateway  | API gateway running on port 8003
rabbitmq     | 2024-01-30 22:18:28.531639+00:00 [info] <0.602.0> accepting AMQP connection <0.602.0> (172.26.0.6:59052 -> 172.26.0.2:5672)
rabbitmq     | 2024-01-30 22:18:28.579221+00:00 [info] <0.602.0> connection <0.602.0> (172.26.0.6:59052 -> 172.26.0.2:5672): user 'minhhoang' authenticated and granted access to vhost '/'
rabbitmq     | 2024-01-30 22:18:30.263331+00:00 [info] <0.623.0> accepting AMQP connection <0.623.0> (172.26.0.3:48306 -> 172.26.0.2:5672)
rabbitmq     | 2024-01-30 22:18:30.269438+00:00 [info] <0.623.0> connection <0.623.0> (172.26.0.3:48306 -> 172.26.0.2:5672): user 'minhhoang' authenticated and granted access to vhost '/'
service2     | Service2 running on port 8000
rabbitmq     | 2024-01-30 22:18:30.282687+00:00 [info] <0.639.0> accepting AMQP connection <0.639.0> (172.26.0.3:48310 -> 172.26.0.2:5672)
rabbitmq     | 2024-01-30 22:18:30.286294+00:00 [info] <0.639.0> connection <0.639.0> (172.26.0.3:48310 -> 172.26.0.2:5672): user 'minhhoang' authenticated and granted access to vhost '/'
service2     | Consuming message
service1     | SND 1 2024-01-30T22:18:30.451Z 172.26.0.3
service2     | RABBITMQ: SND 1 2024-01-30T22:18:30.451Z 172.26.0.3 MSG
service2     | HTTP: SND 1 2024-01-30T22:18:30.451Z 172.26.0.3 172.26.0.4:36586
monitor      | RECEIVED: SND 1 2024-01-30T22:18:30.451Z 172.26.0.3 MSG
monitor      | RECEIVED: SND 1 2024-01-30T22:18:30.451Z 172.26.0.3 172.26.0.4:36586
monitor      | RECEIVED: 200 2024-01-30T22:18:30.482Z
```

### Test the project

1. In terminal

```
curl localhost:8083/state -X PUT -d "PAUSED" -H "Content-Type: text/plain" -H "Accept: text/plain"
```

2. In postman

##### 1. Open Postman
- Open the Postman application.

##### 2. Create a New Request
- Click on the "New" button to create a new request.

##### 3. Set Request Type
- Choose the request type as **PUT**.

##### 4. Enter Request URL
- Enter the URL as `http://localhost:8083/state`.

##### 5. Add Headers
- Add the following headers:
  - **Key:** `Content-Type`, **Value:** `text/plain`
  - **Key:** `Accept`, **Value:** `text/plain`

##### 6. Set Request Body
- In the "Body" tab, select **raw**.
- Enter the payload as `PAUSED`.

##### 7. Send Request
- Click the "Send" button to make the request.

Make sure that the server is running and reachable at `http://localhost:8083`, and that the `/state` endpoint is configured to handle PUT requests with the specified payload format.