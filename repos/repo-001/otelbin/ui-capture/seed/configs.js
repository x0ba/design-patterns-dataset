// Realistic OpenTelemetry Collector configurations as an SRE / platform team
// at a mid-size logistics company ("Northwind Freight") would have shared on
// OTelBin over several months. Each entry becomes a short link (/s/<sha1>)
// created through the app's own POST /s/new endpoint.

const gateway = ({ cluster, region, sampling, env }) => `# Northwind Freight — central OTel gateway (${cluster}, ${region})
# Owner: platform-observability (#obs-platform on Slack)
# Deployed via helm chart otel-gateway, values in infra/k8s/${cluster}/otel-gateway.yaml
# Last reviewed: see PLAT-2291 (tail sampling rollout)

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  pprof:
    endpoint: localhost:1777
  zpages:
    endpoint: localhost:55679
  bearertokenauth/dash0:
    scheme: Bearer
    token: \${env:DASH0_AUTH_TOKEN}
  file_storage/queue:
    directory: /var/lib/otelcol/queue
    timeout: 10s

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - https://track.northwind-freight.io
            - https://*.northwind-freight.io
  prometheus:
    config:
      scrape_configs:
        - job_name: otel-gateway-self
          scrape_interval: 30s
          static_configs:
            - targets: [localhost:8888]
        - job_name: kafka-brokers
          scrape_interval: 60s
          static_configs:
            - targets: [kafka-0.kafka:9308, kafka-1.kafka:9308, kafka-2.kafka:9308]
  k8s_cluster:
    auth_type: serviceAccount
    collection_interval: 30s
    node_conditions_to_report: [Ready, MemoryPressure, DiskPressure]
    allocatable_types_to_report: [cpu, memory]

processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
    spike_limit_percentage: 20
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.pod.name
        - k8s.node.name
      labels:
        - tag_name: team
          key: app.kubernetes.io/team
          from: pod
  resourcedetection:
    detectors: [env, eks, ec2]
    timeout: 5s
    override: false
  resource/cluster:
    attributes:
      - key: k8s.cluster.name
        value: ${cluster}
        action: upsert
      - key: deployment.environment
        value: ${env}
        action: insert
      - key: cloud.region
        value: ${region}
        action: insert
  filter/healthchecks:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/readyz"'
        - 'attributes["url.path"] == "/metrics"'
  transform/redact:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - replace_pattern(attributes["url.query"], "token=[^&]+", "token=***")
          - delete_key(attributes, "http.request.header.authorization")
    log_statements:
      - context: log
        statements:
          - replace_pattern(body, "\\\\b\\\\d{16}\\\\b", "****************")
  tail_sampling:
    decision_wait: 10s
    num_traces: 200000
    expected_new_traces_per_sec: 4000
    policies:
      - name: keep-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: keep-slow-requests
        type: latency
        latency:
          threshold_ms: 1500
      - name: keep-checkout-and-dispatch
        type: string_attribute
        string_attribute:
          key: service.name
          values: [checkout-api, dispatch-planner, carrier-gateway]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: ${sampling}
  batch:
    send_batch_size: 8192
    send_batch_max_size: 10000
    timeout: 5s
  batch/logs:
    send_batch_size: 2048
    timeout: 2s

connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s]
    dimensions:
      - name: http.request.method
      - name: http.response.status_code
      - name: k8s.namespace.name
    metrics_flush_interval: 30s
  servicegraph:
    latency_histogram_buckets: [10ms, 50ms, 100ms, 500ms, 1s, 5s]
    dimensions: [k8s.namespace.name]
    store:
      ttl: 2s
      max_items: 5000
  forward/sampled:

exporters:
  otlp/dash0:
    endpoint: ingress.eu-west-1.aws.dash0.com:4317
    auth:
      authenticator: bearertokenauth/dash0
    headers:
      Dash0-Dataset: northwind-${env}
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
      storage: file_storage/queue
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
  prometheusremotewrite/mimir:
    endpoint: http://mimir-distributor.observability.svc:8080/api/v1/push
    resource_to_telemetry_conversion:
      enabled: true
    external_labels:
      cluster: ${cluster}
  awss3/archive:
    s3uploader:
      region: ${region}
      s3_bucket: nwf-telemetry-archive-${env}
      s3_prefix: logs
      s3_partition_format: year=%Y/month=%m/day=%d/hour=%H
  debug:
    verbosity: basic
    sampling_initial: 5
    sampling_thereafter: 500

service:
  extensions: [health_check, pprof, zpages, bearertokenauth/dash0, file_storage/queue]
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
  pipelines:
    traces/ingest:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, resourcedetection, resource/cluster, filter/healthchecks, transform/redact]
      exporters: [spanmetrics, servicegraph, forward/sampled]
    traces/sampled:
      receivers: [forward/sampled]
      processors: [tail_sampling, batch]
      exporters: [otlp/dash0]
    metrics:
      receivers: [otlp, prometheus, k8s_cluster, spanmetrics, servicegraph]
      processors: [memory_limiter, k8sattributes, resource/cluster, batch]
      exporters: [otlp/dash0, prometheusremotewrite/mimir]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, resource/cluster, transform/redact, batch/logs]
      exporters: [otlp/dash0, awss3/archive]
`;

const nodeAgent = ({ cluster, gatewayHost }) => `# DaemonSet agent — runs on every node in ${cluster}
# Ships to the in-cluster gateway; do NOT export directly to vendors from here.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: \${env:MY_POD_IP}:4317
      http:
        endpoint: \${env:MY_POD_IP}:4318
  hostmetrics:
    collection_interval: 30s
    root_path: /hostfs
    scrapers:
      cpu:
      memory:
      load:
      disk:
      filesystem:
        exclude_mount_points:
          mount_points: [/dev/*, /proc/*, /sys/*, /run/k3s/containerd/*]
          match_type: regexp
      network:
  kubeletstats:
    collection_interval: 30s
    auth_type: serviceAccount
    endpoint: https://\${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    metric_groups: [node, pod, container]
  filelog:
    include: [/var/log/pods/*/*/*.log]
    exclude: [/var/log/pods/observability_otel-agent-*/*/*.log]
    start_at: end
    include_file_path: true
    operators:
      - type: container
        id: container-parser

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 400
    spike_limit_mib: 100
  k8sattributes:
    filter:
      node_from_env_var: K8S_NODE_NAME
  batch:
    timeout: 1s

exporters:
  otlp/gateway:
    endpoint: ${gatewayHost}:4317
    tls:
      insecure: true
    sending_queue:
      queue_size: 2000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp/gateway]
    metrics:
      receivers: [otlp, hostmetrics, kubeletstats]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp/gateway]
    logs:
      receivers: [filelog, otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp/gateway]
`;

const adotEcs = ({ service, region }) => `# ADOT sidecar for ECS task: ${service}
# Task definition: ecs/taskdefs/${service}.json  (FARGATE)
extensions:
  health_check:
  sigv4auth:
    region: ${region}
    service: aps

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  awsecscontainermetrics:
    collection_interval: 20s

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 256
  resourcedetection:
    detectors: [env, ecs]
  batch/traces:
    timeout: 1s
    send_batch_size: 50
  batch/metrics:
    timeout: 60s
  filter/ecs:
    metrics:
      include:
        match_type: strict
        metric_names:
          - ecs.task.memory.utilized
          - ecs.task.memory.reserved
          - ecs.task.cpu.utilized
          - ecs.task.cpu.reserved
          - ecs.task.network.rate.rx
          - ecs.task.network.rate.tx

exporters:
  awsxray:
    region: ${region}
    indexed_attributes: [otel.resource.service.name, http.route]
  awsemf:
    region: ${region}
    namespace: NorthwindFreight/${service}
    log_group_name: /aws/ecs/${service}/metrics
    dimension_rollup_option: NoDimensionRollup
  prometheusremotewrite:
    endpoint: https://aps-workspaces.${region}.amazonaws.com/workspaces/ws-4b1c9e7a-21d0-4f3e-9a55-0c7d2f9e8b31/api/v1/remote_write
    auth:
      authenticator: sigv4auth

service:
  extensions: [health_check, sigv4auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch/traces]
      exporters: [awsxray]
    metrics/app:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch/metrics]
      exporters: [awsemf, prometheusremotewrite]
    metrics/ecs:
      receivers: [awsecscontainermetrics]
      processors: [filter/ecs, batch/metrics]
      exporters: [awsemf]
`;

const splunkEdge = ({ site }) => `# Warehouse edge collector — ${site}
# Runs on the Intel NUC in the server closet. Splunk distro because the
# warehouse team already pays for Splunk Observability Cloud.
extensions:
  health_check:
  file_storage:
    directory: /var/lib/splunk-otel-collector/storage

receivers:
  otlp:
    protocols:
      grpc:
      http:
  hostmetrics:
    collection_interval: 60s
    scrapers:
      cpu:
      memory:
      disk:
      filesystem:
      network:
  syslog:
    tcp:
      listen_address: 0.0.0.0:54526
    protocol: rfc5424
  snmp:
    collection_interval: 120s
    endpoint: udp://10.40.0.2:161
    version: v2c
    community: \${env:SNMP_COMMUNITY}
    metrics:
      if.in.octets:
        unit: By
        sum:
          aggregation: cumulative
          monotonic: true
          value_type: int
        column_oids:
          - oid: 1.3.6.1.2.1.2.2.1.10

processors:
  memory_limiter:
    check_interval: 2s
    limit_mib: 512
  resource/site:
    attributes:
      - key: site.name
        value: ${site}
        action: upsert
  batch:

exporters:
  signalfx:
    access_token: \${env:SPLUNK_ACCESS_TOKEN}
    realm: eu0
  splunk_hec/logs:
    token: \${env:SPLUNK_HEC_TOKEN}
    endpoint: https://hec.northwind-freight.splunkcloud.com:443/services/collector
    source: otel-edge
    sourcetype: syslog
    index: warehouse_edge
    sending_queue:
      storage: file_storage

service:
  extensions: [health_check, file_storage]
  pipelines:
    metrics:
      receivers: [hostmetrics, snmp, otlp]
      processors: [memory_limiter, resource/site, batch]
      exporters: [signalfx]
    logs:
      receivers: [syslog, otlp]
      processors: [memory_limiter, resource/site, batch]
      exporters: [splunk_hec/logs]
`;

const minimal = `receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
`;

const kafkaBuffer = `# Kafka as a buffer between edge and gateway (spike from incident INC-0417)
# Edge collectors -> kafka topic otlp_spans -> this collector -> Dash0
receivers:
  kafka/spans:
    brokers: [kafka-0.kafka:9092, kafka-1.kafka:9092, kafka-2.kafka:9092]
    topic: otlp_spans
    encoding: otlp_proto
    group_id: otel-gateway-consumers
    initial_offset: latest
  kafka/logs:
    brokers: [kafka-0.kafka:9092, kafka-1.kafka:9092, kafka-2.kafka:9092]
    topic: otlp_logs
    encoding: otlp_proto
    group_id: otel-gateway-consumers

processors:
  memory_limiter:
    check_interval: 1s
    limit_percentage: 75
    spike_limit_percentage: 15
  batch:
    send_batch_size: 4096
    timeout: 3s

exporters:
  otlp/dash0:
    endpoint: ingress.eu-west-1.aws.dash0.com:4317
    headers:
      Authorization: Bearer \${env:DASH0_AUTH_TOKEN}

service:
  pipelines:
    traces:
      receivers: [kafka/spans]
      processors: [memory_limiter, batch]
      exporters: [otlp/dash0]
    logs:
      receivers: [kafka/logs]
      processors: [memory_limiter, batch]
      exporters: [otlp/dash0]
`;

const routingByTenant = `# Multi-tenant routing for the carrier partner API
# tenant comes from the X-Scope-OrgID header via include_metadata
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        include_metadata: true

connectors:
  routing:
    default_pipelines: [traces/default]
    error_mode: ignore
    table:
      - statement: route() where attributes["tenant"] == "dhl-eu"
        pipelines: [traces/dhl]
      - statement: route() where attributes["tenant"] == "maersk"
        pipelines: [traces/maersk]

processors:
  attributes/tenant:
    actions:
      - key: tenant
        from_context: metadata.x-scope-orgid
        action: upsert
  batch:

exporters:
  otlphttp/tempo-dhl:
    endpoint: http://tempo-dhl.tracing.svc:4318
  otlphttp/tempo-maersk:
    endpoint: http://tempo-maersk.tracing.svc:4318
  otlphttp/tempo-default:
    endpoint: http://tempo.tracing.svc:4318

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      processors: [attributes/tenant]
      exporters: [routing]
    traces/dhl:
      receivers: [routing]
      processors: [batch]
      exporters: [otlphttp/tempo-dhl]
    traces/maersk:
      receivers: [routing]
      processors: [batch]
      exporters: [otlphttp/tempo-maersk]
    traces/default:
      receivers: [routing]
      processors: [batch]
      exporters: [otlphttp/tempo-default]
`;

// A half-finished draft with a real mistake (processor referenced but never defined).
const brokenDraft = `# WIP: migrate logs from fluent-bit to the collector
# TODO(jkowalski): parse the nginx access log format, currently just raw lines
receivers:
  filelog/nginx:
    include: [/var/log/nginx/access.log, /var/log/nginx/error.log]
    start_at: beginning
  fluentforward:
    endpoint: 0.0.0.0:8006

processors:
  batch:
  # memory_limiter:
  #   limit_mib: 300

exporters:
  otlphttp/loki:
    endpoint: http://loki-gateway.logging.svc/otlp
  debug:

service:
  pipelines:
    logs:
      receivers: [filelog/nginx, fluentforward]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/loki, debug]
`;

const jaegerMigration = `# Bridge for legacy services still emitting Jaeger thrift / Zipkin
# (route-optimizer v2 and the old PHP invoicing app). Remove after Q1 migration.
receivers:
  jaeger:
    protocols:
      thrift_http:
        endpoint: 0.0.0.0:14268
      thrift_compact:
        endpoint: 0.0.0.0:6831
  zipkin:
    endpoint: 0.0.0.0:9411
  otlp:
    protocols:
      grpc:

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
  attributes/legacy:
    actions:
      - key: telemetry.source
        value: legacy-bridge
        action: insert
  batch:

exporters:
  otlp:
    endpoint: otel-gateway.observability.svc:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [jaeger, zipkin, otlp]
      processors: [memory_limiter, attributes/legacy, batch]
      exporters: [otlp]
`;

const coreWithContribComponent = `# Trying the slim core distro for the dispatch-planner sidecar
# (image size matters on the Raspberry Pi scanners)
receivers:
  otlp:
    protocols:
      grpc:
  filelog:
    include: [/var/log/scanner/*.log]

processors:
  batch:

exporters:
  otlp:
    endpoint: otel-gateway.observability.svc:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [filelog]
      processors: [batch]
      exporters: [otlp]
`;

const spanmetricsOnly = `# RED metrics from spans for the on-call dashboard
receivers:
  otlp:
    protocols:
      grpc:
      http:

connectors:
  spanmetrics:
    namespace: traces.span.metrics
    dimensions:
      - name: http.route
      - name: rpc.method
    exemplars:
      enabled: true

processors:
  batch:

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    enable_open_metrics: true
  otlp/jaeger:
    endpoint: jaeger-collector.tracing.svc:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [spanmetrics, otlp/jaeger]
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
`;

const github = `# CI visibility: GitHub Actions webhook -> traces
receivers:
  github:
    webhook:
      endpoint: 0.0.0.0:19418
      path: /events
      health_path: /health
      secret: \${env:GITHUB_WEBHOOK_SECRET}
    scrapers:
      scraper:
        github_org: northwind-freight
        auth:
          authenticator: bearertokenauth/github

extensions:
  bearertokenauth/github:
    token: \${env:GH_PAT}

processors:
  batch:

exporters:
  otlp/dash0:
    endpoint: ingress.eu-west-1.aws.dash0.com:4317
    headers:
      Authorization: Bearer \${env:DASH0_AUTH_TOKEN}
      Dash0-Dataset: ci

service:
  extensions: [bearertokenauth/github]
  pipelines:
    traces:
      receivers: [github]
      processors: [batch]
      exporters: [otlp/dash0]
    metrics:
      receivers: [github]
      processors: [batch]
      exporters: [otlp/dash0]
`;

const TOKEN = "auth_7Hq2LwX9pR4mZ1cV8bN3tK6yF0dS5gJe";

module.exports = [
	// main entry: the prod gateway, validated against contrib with env vars bound
	{
		key: "prod-gateway-eu",
		config: gateway({ cluster: "nwf-prod-eu-1", region: "eu-west-1", sampling: 10, env: "production" }),
		distro: "otelcol-contrib",
		distroVersion: "v0.160.0",
		env: { DASH0_AUTH_TOKEN: TOKEN },
	},
	{
		key: "prod-gateway-us",
		config: gateway({ cluster: "nwf-prod-us-2", region: "us-east-2", sampling: 10, env: "production" }),
		distro: "otelcol-contrib",
		distroVersion: "v0.159.0",
		env: { DASH0_AUTH_TOKEN: TOKEN },
	},
	{
		key: "staging-gateway",
		config: gateway({ cluster: "nwf-staging-eu-1", region: "eu-west-1", sampling: 50, env: "staging" }),
		distro: "otelcol-contrib",
		distroVersion: "v0.157.0",
	},
	{
		key: "dev-gateway",
		config: gateway({ cluster: "nwf-dev", region: "eu-central-1", sampling: 100, env: "development" }),
	},
	...["nwf-prod-eu-1", "nwf-prod-us-2", "nwf-staging-eu-1", "nwf-dev", "nwf-batch-eu-1"].map((cluster) => ({
		key: `node-agent-${cluster}`,
		config: nodeAgent({ cluster, gatewayHost: "otel-gateway.observability.svc.cluster.local" }),
		distro: "otelcol-contrib",
		distroVersion: "v0.158.0",
		env: { MY_POD_IP: "10.42.3.17", K8S_NODE_NAME: "ip-10-42-3-17.eu-west-1.compute.internal" },
	})),
	...["shipment-tracker", "label-printer-svc", "customs-docs", "rate-quote-api", "pod-photo-upload", "eta-predictor", "invoice-renderer", "driver-app-bff"].map((service, i) => ({
		key: `adot-${service}`,
		config: adotEcs({ service, region: i % 2 ? "us-east-2" : "eu-west-1" }),
		distro: "adot",
		distroVersion: i < 4 ? "v0.50.0" : ["v0.49.0", "v0.48.0", "v0.50.0", "v0.47.0"][i - 4],
	})),
	...["Rotterdam DC", "Duisburg Hub", "Gdansk Crossdock", "Memphis DC", "Lyon Parcel Hub", "Antwerp Port Office", "Louisville Air Hub"].map((site) => ({
		key: `edge-${site}`,
		config: splunkEdge({ site }),
		distro: "splunk-otel-collector",
		distroVersion: "v0.160.1",
		env: { SPLUNK_ACCESS_TOKEN: "Xk3m9QvT2pLw8RzN5c", SPLUNK_HEC_TOKEN: "6f1e2d4c-9a0b-4e57-8c3d-2b7f1a9e0d64" },
	})),
	{ key: "minimal-debug", config: minimal },
	{ key: "minimal-debug-core", config: minimal, distro: "otelcol-core", distroVersion: "v0.160.0" },
	{ key: "kafka-buffer", config: kafkaBuffer, distro: "otelcol-contrib", distroVersion: "v0.156.0" },
	{ key: "routing-by-tenant", config: routingByTenant, distro: "otelcol-contrib", distroVersion: "v0.160.0" },
	{ key: "broken-logs-draft", config: brokenDraft, distro: "otelcol-contrib", distroVersion: "v0.160.0" },
	{ key: "jaeger-bridge", config: jaegerMigration, distro: "otelcol-core", distroVersion: "v0.155.0" },
	{ key: "core-scanner-sidecar", config: coreWithContribComponent, distro: "otelcol-core", distroVersion: "v0.160.0" },
	{ key: "red-metrics", config: spanmetricsOnly },
	{ key: "github-ci", config: github, distro: "otelcol-contrib", distroVersion: "v0.160.0" },
];
