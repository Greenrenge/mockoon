TODO:

- mono repo to add server moleculer
- to mock get user / conf / template ....
- to do a remote setting proxy to supabase ?
- read to the supabase db subscription to run instance of mockoon? or cloudfunction like the supabase function?

- create new ServerInstance for the server side

- DownSync:: DownSyncActions
- NOT SURE THAT reducerActionToSyncActionBuilder --> make other that subscribe to the store must download that built one

export type EnvironmentDescriptor = {
uuid: string;
path: string;
// is it a cloud environment?
cloud: boolean;
// last hash seen on the server
lastServerHash: string | null;
};
-use reducer to be a backend logic ? // see transformSyncAction

# Add cloud env

{"type":"ADD_CLOUD_ENVIRONMENT","timestamp":1744857470707.5,"environment":{"uuid":"547bddf1-8053-4338-ba4b-c0450f4af48a","lastMigration":33,"name":"New cloud environment","endpointPrefix":"","latency":0,"port":3000,"hostname":"","folders":[],"routes":[{"uuid":"e6b9120d-8070-4a66-b790-93f3540561f0","type":"http","documentation":"","method":"get","endpoint":"","responses":[{"uuid":"fd1b2947-93c2-47e7-ab71-a762744d9d46","body":"{}","latency":0,"statusCode":200,"label":"","headers":[],"bodyType":"INLINE","filePath":"","databucketID":"","sendFileAsBody":false,"rules":[],"rulesOperator":"OR","disableTemplating":false,"fallbackTo404":false,"default":true,"crudKey":"id","callbacks":[]}],"responseMode":null,"streamingMode":null,"streamingInterval":0}],"rootChildren":[{"type":"route","uuid":"e6b9120d-8070-4a66-b790-93f3540561f0"}],"proxyMode":false,"proxyHost":"","proxyRemovePrefix":false,"tlsOptions":{"enabled":false,"type":"CERT","pfxPath":"","certPath":"","keyPath":"","caPath":"","passphrase":""},"cors":true,"headers":[{"key":"Content-Type","value":"application/json"},{"key":"Access-Control-Allow-Origin","value":"*"},{"key":"Access-Control-Allow-Methods","value":"GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS"},{"key":"Access-Control-Allow-Headers","value":"Content-Type, Origin, Accept, Authorization, Content-Length, X-Requested-With"}],"proxyReqHeaders":[{"key":"","value":""}],"proxyResHeaders":[{"key":"","value":""}],"data":[],"callbacks":[]}}

# Remove cloud env

{"type":"REMOVE_CLOUD_ENVIRONMENT","timestamp":1744886098706.5,"environmentUuid":"5d933f3c-faf8-483e-a98d-17c2effdeef5"}

# update route

{"type":"UPDATE_ROUTE","timestamp":1744857637547.5,"environmentUuid":"547bddf1-8053-4338-ba4b-c0450f4af48a","routeUuid":"e6b9120d-8070-4a66-b790-93f3540561f0","properties":{"endpoint":"hello"}}
{"type":"UPDATE_ROUTE","timestamp":1744857670511.5,"environmentUuid":"547bddf1-8053-4338-ba4b-c0450f4af48a","routeUuid":"e6b9120d-8070-4a66-b790-93f3540561f0","properties":{"method":"post"}}
{"type":"UPDATE_ROUTE","timestamp":1744857686668.5,"environmentUuid":"547bddf1-8053-4338-ba4b-c0450f4af48a","routeUuid":"e6b9120d-8070-4a66-b790-93f3540561f0","properties":{"documentation":"FFFFFsssdf"}}

# add data bucket

{"type":"ADD_DATABUCKET","timestamp":1744857604352.5,"environmentUuid":"547bddf1-8053-4338-ba4b-c0450f4af48a","databucket":{"uuid":"484f3a74-39d4-48a7-9079-3fe5e3c7c455","id":"xvfp","name":"New data","documentation":"","value":"[\n]"}}

# AUTO REMOVE ENV IF NO DEPLOY

{"type":"REMOVE_CLOUD_ENVIRONMENT","timestamp":1744859953583.5,"environmentUuid":"547bddf1-8053-4338-ba4b-c0450f4af48a"}

## DEPLOY

# check subdomain

curl 'http://localhost:6000/deployments/subdomain' \
 -H 'sec-ch-ua-platform: "macOS"' \
 -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IjdpNW8veEYza3lwR0VEdlgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3V2eHVtaWZvY2pzaGlqYnFmYnVmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyMzkwNTAwYS04M2NjLTRjODgtOGU4OC1kN2M5MjVkNWExODEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQ0ODY0NTY4LCJpYXQiOjE3NDQ4NjA5NjgsImVtYWlsIjoiZ3JlZW5yZW5nZUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImdpdGh1YiIsInByb3ZpZGVycyI6WyJnaXRodWIiXX0sInVzZXJfbWV0YWRhdGEiOnsiYXZhdGFyX3VybCI6Imh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNzg1NTExMz92PTQiLCJlbWFpbCI6ImdyZWVucmVuZ2VAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IktpdHRoYW5hdCIsImlzcyI6Imh0dHBzOi8vYXBpLmdpdGh1Yi5jb20iLCJuYW1lIjoiS2l0dGhhbmF0IiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJHcmVlbnJlbmdlIiwicHJvdmlkZXJfaWQiOiIxNzg1NTExMyIsInN1YiI6IjE3ODU1MTEzIiwidXNlcl9uYW1lIjoiR3JlZW5yZW5nZSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzQ0Nzc3NjY3fV0sInNlc3Npb25faWQiOiJkZWY4ZjI4MS0xZDVlLTRjMjUtODhiYi02MmM4NDNlZWJmNjEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.bT5uwfn32etO*W0gGHmHJWzyhdmFtvzbpWlIM68jEZg' \
 -H 'Referer: http://localhost:5003/' \
 -H 'sec-ch-ua: "Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"' \
 -H 'sec-ch-ua-mobile: ?0' \
 -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36' \
 -H 'Accept: application/json, text/plain, */\_' \
 -H 'Content-Type: application/json' \
 --data-raw '{"subdomain":"fdasf","environmentUuid":null}'

# deploy

curl 'http://localhost:6000/deployments' \
 -H 'sec-ch-ua-platform: "macOS"' \
 -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6IjdpNW8veEYza3lwR0VEdlgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3V2eHVtaWZvY2pzaGlqYnFmYnVmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyMzkwNTAwYS04M2NjLTRjODgtOGU4OC1kN2M5MjVkNWExODEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQ0ODY0NTY4LCJpYXQiOjE3NDQ4NjA5NjgsImVtYWlsIjoiZ3JlZW5yZW5nZUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImdpdGh1YiIsInByb3ZpZGVycyI6WyJnaXRodWIiXX0sInVzZXJfbWV0YWRhdGEiOnsiYXZhdGFyX3VybCI6Imh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNzg1NTExMz92PTQiLCJlbWFpbCI6ImdyZWVucmVuZ2VAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IktpdHRoYW5hdCIsImlzcyI6Imh0dHBzOi8vYXBpLmdpdGh1Yi5jb20iLCJuYW1lIjoiS2l0dGhhbmF0IiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJHcmVlbnJlbmdlIiwicHJvdmlkZXJfaWQiOiIxNzg1NTExMyIsInN1YiI6IjE3ODU1MTEzIiwidXNlcl9uYW1lIjoiR3JlZW5yZW5nZSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzQ0Nzc3NjY3fV0sInNlc3Npb25faWQiOiJkZWY4ZjI4MS0xZDVlLTRjMjUtODhiYi02MmM4NDNlZWJmNjEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.bT5uwfn32etO*W0gGHmHJWzyhdmFtvzbpWlIM68jEZg' \
 -H 'Referer: http://localhost:5003/' \
 -H 'sec-ch-ua: "Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"' \
 -H 'sec-ch-ua-mobile: ?0' \
 -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36' \
 -H 'Accept: application/json, text/plain, */\_' \
 -H 'Content-Type: application/json' \
 --data-raw '{"environment":{"uuid":"c1b41406-1776-4f97-a198-38ed5adfd542","lastMigration":33,"name":"New cloud environment","endpointPrefix":"","latency":0,"port":3000,"hostname":"","folders":[],"routes":[{"uuid":"3b2a0f96-c3bd-4086-b9e4-a7063bab223e","type":"http","documentation":"","method":"get","endpoint":"","responses":[{"uuid":"054af263-9513-4a46-9e12-3012e46b28ef","body":"{}","latency":0,"statusCode":200,"label":"","headers":[],"bodyType":"INLINE","filePath":"","databucketID":"","sendFileAsBody":false,"rules":[],"rulesOperator":"OR","disableTemplating":false,"fallbackTo404":false,"default":true,"crudKey":"id","callbacks":[]}],"responseMode":null,"streamingMode":null,"streamingInterval":0}],"rootChildren":[{"type":"route","uuid":"3b2a0f96-c3bd-4086-b9e4-a7063bab223e"}],"proxyMode":false,"proxyHost":"","proxyRemovePrefix":false,"tlsOptions":{"enabled":false,"type":"CERT","pfxPath":"","certPath":"","keyPath":"","caPath":"","passphrase":""},"cors":true,"headers":[{"key":"Content-Type","value":"application/json"},{"key":"Access-Control-Allow-Origin","value":"*"},{"key":"Access-Control-Allow-Methods","value":"GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS"},{"key":"Access-Control-Allow-Headers","value":"Content-Type, Origin, Accept, Authorization, Content-Length, X-Requested-With"}],"proxyReqHeaders":[{"key":"","value":""}],"proxyResHeaders":[{"key":"","value":""}],"data":[],"callbacks":[]},"subdomain":"fffffffff","visibility":"PRIVATE","version":"9.2.0"}'
