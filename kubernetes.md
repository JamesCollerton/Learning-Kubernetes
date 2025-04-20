# Structure

# Overview

- Kubernetes is an open source orchestrator for deploying containerized applications.
- It's designed to make services:
    - Reliable - They don't fall over
    - Available - They can always be used and are never taken down, on purpose or otherwise
    - Scalable - They can deal with higher traffic, without manual intervention
- Some of its core features are:
    - Immutability - We don't incrementally update what is deployed, we just completely replace it
    - Declarative configuration - Deployments are defined by what we want there, not by the steps to create it
    - Online self-healing systems - Kubernetes is constantly adjusting itself to match the declaration

## Images

### Overview

- Application programs are typically comprised of a language runtime, libraries, and your source code.
    - Language runtimes: The JVM for example
    - Libraries: Things that sit on the OS, e.g. libc and libssl
    - Source code: The code we're actually running
- The most popular container image format is the Docker image format, which has been standardized by the Open Container Initiative to the OCI image format. Kubernetes supports both Docker- and OCI-compatible images via Docker and other runtimes.
- A container image is a binary package that encapsulates all of the files necessary to run a program inside of an OS container.
- Docker images aren't a single file, but are more a way of specifying which other files to pull in.
- We create images by building on previous ones, e.g. A is OS, B adds libraries, C is runtime
- A container image commonly comes with a container configuration, which tells us how to run the image (e.g. docker-compose).

### Optimizing Image Sizes

- Small image sizes means quicker deployment times.
- Files removed by subsequent Docker layers are still there, they're just inaccessible, leading to larger binary sizes.
- We need to be careful when changing the layers in our image. Everything after a changed layer needs to be updated, meaning we don't get the benefit of the **build cache**.
- **Multistage builds.** With multistage builds, rather than producing a single image, a Docker file can actually produce multiple images. Each image is considered a stage. Artifacts can be copied from preceding stages to the current stage. An example Dockerfile is below.
  ```
  FROM node:20-alpine AS builder
  WORKDIR /kubernetes-next-app
  
  COPY ./kubernetes-next-app .
  
  RUN npm install
  RUN npm run build
  
  # Runs the production build.
  FROM node:20-alpine AS runner
  WORKDIR /kubernetes-next-app
  
  # Copy all production build files from build step
  # container
  RUN mkdir .next
  
  COPY --from=builder /kubernetes-next-app/public ./public
  COPY --from=builder /kubernetes-next-app/.next/standalone ./
  COPY --from=builder /kubernetes-next-app/.next/static ./.next/static
  ```

### Containers

- These are basically just running images.

### Commands

- List images: `docker images`
- Remove images: `docker rmi <tag-name>`/ `docker rmi <image-id>`
- Start a container: `docker run -d --name <friendl-name> --publish <port:port mapping> <image details, e.g. gcr.io/repo/image-name:tag>`
    - Useful flags
        - Limit CPU/ memory (if program in the container uses too much memory, it will be terminated): `--memory 200m --memory-swap 1G --cpu-shares 1024`

## Applications

- The concept of the program you would like to run
- Can be colocated on the same machines without impacting the applications themselves.
- An increase in efficiency comes from the fact that a developer’s test environment can be quickly and cheaply created as a set of containers running in a personal view of a shared Kubernetes cluster using namespaces.

## Context

- A Kubernetes context is a set of configuration parameters that define which Kubernetes cluster you are interacting with, which user you are using to access it, and which namespace you are working within.
- It basically prevents you having to specify these things with every command (e.g. no need for `-n <namespace>` on each command).
- A "cluster" is a group of physical machines working together as a single system, while a "namespace" is a logical division within that cluster.
- If you want to change the default namespace more permanently, you can use a context.
- This gets recorded in a kubectl configuration file, usually located at `$HOME/.kube/config`.
- The configuration file also stores how to both find and authenticate to your cluster.
- The kubernetes concept (and term) context only applies in the kubernetes client-side, i.e. the place where you run the kubectl command, e.g. your command prompt. The kubernetes server-side doesn't recognise this term 'context'. This is different to namespacesm which exist server-side.

### Commands

- Create a context with different default namespace: `kubectl config set-context <context-name> --namespace=<namespace>`.
- Start using your new context: `kubectl config use-context <context-name>`

## Cluster

- A group of machines (nodes) that work together to run containerized applications, managed by a control plane, allowing for efficient, automated, distributed, and scalable application deployment and management.
- The worker node(s) host the Pods that are the components of the application workload. The control plane manages the worker nodes and the Pods in the cluster. In production environments, the control plane usually runs across multiple computers and a cluster usually runs multiple nodes, providing fault-tolerance and high availability.

## Namespace

- Namespaces are a way to organize clusters into virtual sub-clusters — they can be helpful when different teams or projects share a Kubernetes cluster.
- Some objects are namespaced (e.g. Deployments, Services, etc.) and some are cluster-wide (e.g. StorageClass, Nodes, PersistentVolumes, etc.).
- Namespaces are intended for use in environments with many users spread across multiple teams, or projects. 

## Labels and annotations

- Labels are key/value pairs that can be attached to Kubernetes objects such as Pods and ReplicaSets. They can be arbitrary, and are useful for attaching identifying information to Kubernetes objects. Labels provide the foundation for grouping objects.
- Annotations, on the other hand, provide a storage mechanism that resembles labels: annotations are key/value pairs designed to hold nonidentifying information that can be leveraged by tools and libraries.
- Annotations are used to provide extra information about where an object came from, how to use it, or policy around that object.
- Annotations are used in various places in Kubernetes, with the primary use case being rolling deployments. During rolling deployments, annotations are used to track rollout status and provide the necessary information required to roll back a deployment to a previous state.
- Annotation keys use the same format as label keys because they are often used to communicate information between tools.
- The value component of an annotation is a free-form string field. While this allows maximum flexibility as users can store arbitrary data, because this is arbitrary text, there is no validation of any format. For example, it is not uncommon for a JSON document to be encoded as a string and stored in an annotation.

### Commands

- `kubectl label <object-type> <object-name> "key=value"`
- `kubectl get <object-type> --selector="key=value"`

## Pods

### Overview

- A Pod represents a collection of application containers and volumes running in the same execution environment. 
- Pods, not containers, are the smallest deployable artifact in a Kubernetes cluster. This means all of the containers in a Pod always land on the same machine (node).

### Usage

- You will often want to colocate multiple applications into a single atomic unit, scheduled onto a single machine.
- You might want different containers as the different part of your application have different resource requirements, but share something underlying (e.g. storage). We don't want one container to take down the other if it starts gobbling resources.
- Applications running in the same Pod share the same IP address and port space (network namespace), have the same hostname (UTS namespace), and can communicate using native interprocess communication channels over System V IPC or POSIX message queues (IPC namespace). However, applications in different Pods are isolated from each other.
- We only put things on the same pod if they won't work on different machines.

### Working with Pods

- Pods are described in a Pod manifest. The Pod manifest is just a text-file representation of the Kubernetes API object.
- The Kubernetes API server accepts and processes Pod manifests before storing them in persistent storage (etcd).
- The scheduler also uses the Kubernetes API to find Pods that haven’t been scheduled to a node. The scheduler then places the Pods onto nodes depending on the resources and other constraints expressed in the Pod manifests

#### Full Example Pod Manifest

```
apiVersion: v1
kind: Pod
metadata:
    name: kuard
    spec:
        volumes:
            - name: "kuard-data"
              nfs:
              server: my.nfs.server.local
              path: "/exports"
        containers:
            - image: "gcr.io/kuar-demo/kuard-amd64:blue"
              name: "kuard"
              ports:
                  - containerPort: 8080
                    name: http
                    protocol: TCP
              resources:
                  requests:
                      cpu: "500m"
                      memory: "128Mi"
                  limits:
                      cpu: "1000m"
                      memory: "256Mi"
        volumeMounts:
            - mountPath: "/data"
              name: "kuard-data"
        livenessProbe:
            httpGet:
                path: /healthy
                port: 8080
                initialDelaySeconds: 5
                timeoutSeconds: 1
                periodSeconds: 10
                failureThreshold: 3
        readinessProbe:
            httpGet:
                path: /ready
                port: 8080
                initialDelaySeconds: 30
                timeoutSeconds: 1
                periodSeconds: 10
                failureThreshold: 3
```

### Probes/ Healthchecks

- There are three categories of probe: startup, readiness and liveness.
    - Startup: A startup probe verifies whether the application within a container is started. 
    - Readiness: Readiness probes determine when a container is ready to start accepting traffic. 
    - Liveness: Liveness probes determine when to restart a container. For example, liveness probes could catch a deadlock when an application is running but unable to make progress.
- [Probes can then use different checks (e.g. exec, grpc, httpGet, tcpSocket)](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)
- When you run your application as a container in Kubernetes, it is automatically kept alive for you using a process health check. This health check simply ensures that the main process of your application is always running. If it isn’t, Kubernetes restarts it.
- However, in most cases a health check isn't enough. You also want to check the application is running and responsive (a liveness check).
- You may also want a readiness probe, readiness describes when a container is ready to serve user requests.
- Containers that fail liveness checks are restarted. Containers that fail readiness checks are removed from service load balancers.

### Resource Management

- Done on a per-pod basis
- We can use Kubernetes to ensure better utilisation of underlying resources.
- Kubernetes allows users to specify two different resource metrics. 
    - Resource _requests_ specify the minimum amount of a resource required to run the application.
        - Kubernetes guarantees that these resources are available to the Pod, it's a resource minimum.
        - Requests are used when scheduling Pods to nodes. The Kubernetes scheduler will ensure that the sum of all requests of all Pods on a node does not exceed the capacity of the node.
    - Resource _limits_ specify the maximum amount of a resource that an application can consume.

### Lifecycle

- Pods follow a defined lifecycle, starting in the Pending phase, moving through Running if at least one of its primary containers starts OK, and then through either the Succeeded or Failed phases depending on whether any container in the Pod terminated in failure.
- Whilst a Pod is running, the kubelet is able to restart containers to handle some kind of faults. 
- Pods are only scheduled once in their lifetime; assigning a Pod to a specific node is called binding, and the process of selecting which node to use is called scheduling.
- Once a Pod has been scheduled and is bound to a node, Kubernetes tries to run that Pod on the node. 
- As well as the phase of the Pod overall, Kubernetes tracks the state of each container inside a Pod. You can use container lifecycle hooks to trigger events to run at certain points in a container's lifecycle.
- Once the scheduler assigns a Pod to a Node, the kubelet starts creating containers for that Pod using a container runtime. There are three possible container states: Waiting, Running, and Terminated.
- Kubernetes manages containers using a [restart policy](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-restarts) defined in the spec.

### Sidecars

- An instance of [the sidecar concept](https://learn.microsoft.com/en-us/azure/architecture/patterns/sidecar).
- Sidecars are supporting processes or services that are deployed with the primary application.
- Kubernetes implements sidecar containers as a special case of init containers; sidecar containers remain running after Pod startup.
- Normal init containers will just run on start up, do a job, then finish.
- If an init container is created with its restartPolicy set to Always, it will start and remain running during the entire life of the Pod. This can be helpful for running supporting services separated from the main application containers (a.k.a. sidecars).
- The benefit of a sidecar container being independent from other init containers (without restart policy always) and from the main application container(s) within the same pod. These can be started, stopped, or restarted without affecting the main application container and other init containers.
- If a readinessProbe is specified for this init container, its result will be used to determine the ready state of the Pod.
- You can reuse sidecar containers for multiple applications (e.g. logging, running a server for SSL termination)
- [Useful tutorial](https://kodekloud.com/blog/kubernetes-sidecar-container/)

## Deployments

- A Kubernetes deployment is a resource object in Kubernetes that provides declarative updates to applications. A deployment allows you to describe an application’s life cycle, such as which images to use for the app, the number of pods there should be, and the way in which they should be updated.
- You describe a desired state in a Deployment, and the Deployment Controller changes the actual state to the desired state at a controlled rate.
- A ReplicaSet's purpose is to maintain a stable set of replica Pods running at any given time. Usually, you define a Deployment and let that Deployment manage ReplicaSets automatically.
- Example deployment configuration:
```
kind: Deployment
metadata:
  name: kubernetes-next-app-deployment
  labels:
    app: kubernetes-next-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kubernetes-next-app
  template:
    metadata:
      labels:
        app: kubernetes-next-app
    spec:
      volumes:
        - name: kna-pv-storage
          persistentVolumeClaim:
            claimName: kna-pv-claim
      containers:
      - name: kubernetes-next-app
        image: kubernetes-next-app:1.0.0
        volumeMounts:
        - mountPath: /mnt/data
          name: kna-pv-storage
        # We expose the 3000 pod where the container runs the application
        ports:
          - containerPort: 3000
            name: http
            protocol: TCP
        # We also set a readinessProbe, which lets kubelet (running on the
        # node) know when the pod is ready to serve traffic. We need this so
        # the service knows the pod is ready
        readinessProbe:
          httpGet:
            path: /api
            port: 3000
          initialDelaySeconds: 30
          timeoutSeconds: 1
          periodSeconds: 10
          failureThreshold: 3
```

<!-- - TODO: How do we define an HPA with a deployment? -->

## Volumes

- Why we need volumes
    - **Data persistence:** On-disk files in a container are ephemeral, which presents some problems for non-trivial applications when running in containers. One problem occurs when a container crashes or is stopped, the container state is not saved so all of the files that were created or modified during the lifetime of the container are lost. After a crash, kubelet restarts the container with a clean state.
    - **Shared storage:** Another problem occurs when multiple containers are running in a Pod and need to share files. It can be challenging to set up and access a shared filesystem across all of the containers.
- Ephemeral volume types have a lifetime linked to a specific Pod, but persistent volumes exist beyond the lifetime of any individual pod. 
- To use a volume, specify the volumes to provide for the Pod in `.spec.volumes` and declare where to mount those volumes into containers in `.spec.containers[*].volumeMounts`.
- When a pod is launched, a process in the container sees a filesystem view composed from the initial contents of the container image, plus volumes (if defined) mounted inside the container. The process sees a root filesystem that initially matches the contents of the container image. Any writes to within that filesystem hierarchy, if allowed, affect what that process views when it performs a subsequent filesystem access. Volumes are mounted at specified paths within the container filesystem. For each container defined within a Pod, you must independently specify where to mount each volume that the container uses.
- There are many [different types of volume, including cloud-based ones (e.g. S3)](https://kubernetes.io/docs/concepts/storage/volumes/).

### ConfigMap

- A ConfigMap provides a way to inject configuration data into pods. The data stored in a ConfigMap can be referenced in a volume of type configMap and then consumed by containerized applications running in a pod.
- The log-config ConfigMap is mounted as a volume, and all contents stored in its log_level entry are mounted into the Pod at path /etc/config/log_level.conf. Note that this path is derived from the volume's mountPath and the path keyed with log_level.

```
apiVersion: v1
kind: Pod
metadata:
  name: configmap-pod
spec:
  containers:
    - name: test
      image: busybox:1.28
      command: ['sh', '-c', 'echo "The app is running!" && tail -f /dev/null']
      volumeMounts:
        - name: config-vol
          mountPath: /etc/config
  volumes:
    - name: config-vol
      configMap:
        name: log-config
        items:
          - key: log_level
            path: log_level.conf
```

### EmptyDir

- For a Pod that defines an emptyDir volume, the volume is created when the Pod is assigned to a node. As the name says, the emptyDir volume is initially empty. All containers in the Pod can read and write the same files in the emptyDir volume, though that volume can be mounted at the same or different paths in each container.

### Secrets

- Secret data can be exposed to Pods using the secrets volume type.
- Secrets are similar to ConfigMaps but are specifically intended to hold confidential data.
- Secrets are stored on tmpfs volumes (aka RAM disks), and as such are not written to disk on nodes.

```
apiVersion: v1
kind: Pod
metadata:
    name: kuard-tls
spec:
    containers:
    - name: kuard-tls
    image: gcr.io/kuar-demo/kuard-amd64:blue
    imagePullPolicy: Always
    volumeMounts:
    - name: tls-certs
    mountPath: "/tls"
    readOnly: true
    volumes:
        - name: tls-certs
        secret:
        secretName: kuard-tls
```

## Replica Sets

- A ReplicaSet acts as a cluster-wide Pod manager, ensuring that the right types and number of Pods are running at all times.
- Provide the underpinnings of self-healing for our applications at the infrastructure level.
- When we define a ReplicaSet, we define a specification for the Pods we want to create (the “cookie cutter”), and a desired number of replicas. Additionally, we need to define a way of finding Pods that the ReplicaSet should control. 
- The actual act of managing the replicated Pods is an example of a reconciliation loop.
- The central concept behind a reconciliation loop is the notion of desired state versus observed or current state.
- The relationship between ReplicaSets and Pods is loosely coupled.
- Sets use label queries to identify the set of Pods they should be managing.
- Quarantining: doing so will disassociate it from the ReplicaSet (and service) so that you can debug the Pod.
- When the number of Pods in the current state is less than the number of Pods in the desired state, the ReplicaSet controller will create new Pods.
- You can create a ReplicaSet using manifest files in the same way as any other object
- You can do things like find which Replica Set is controlling a pod, or find all pods in a Replica Set.
- You can scale ReplicaSets specifically using `kubectl scale`, e.g. `kubectl scale replicasets kuard --replicas=4`

### Autoscaling and HPA

- You may want to scale dependent on different factors - for example, with a web server like NGINX, you may want to scale due to CPU usage. For an in-memory cache, you may want to scale with memory consumption.
- Kubernetes can handle all of these scenarios via Horizontal Pod Autoscaling (HPA).
- HPA requires the presence of the `heapster` Pod on your cluster. `heapster` keeps track of metrics and provides an API for consuming metrics that HPA uses when making scaling decisions.

### Commands

- Scale a replica set to a certain number of pods: `kubectl scale replicasets kuard --replicas=4`
- Set scaling based on CPU: `kubectl autoscale rs kuard --min=2 --max=5 --cpu-percent=80`
- See all HPAs: `kubectl get hpa`

### Observability

- Logs from containers running on a pod can be viewed via `kubectl logs`.
- You can go into your container and have a poke around via `kubectl exec`.
- You can view metrics with `kubectl top pod`
- You can implement Kubernetes [audit logging](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/), which will track what happens on your cluster. 

#### Commands

- View logs: `kubectl logs <pod-name>`
- Execute command in shell: `kubectl exec -it <pod-name> -- <command, e.g. bash>`
- View metrics for pod: `kubectl top pod <pod-name>`

## Nodes

- Kubernetes runs your workload by placing containers into Pods to run on Nodes. 
- A node may be a virtual or physical machine, depending on the cluster.
- Nodes are separated into master nodes (AKA the control plane, runs core processes, e.g. scheduler) and worker nodes (your application).
- The components on a node include the kubelet, a container runtime, and the kube-proxy.

### Kubelet

- An agent that runs on each node in the cluster. It makes sure that containers are running in a Pod.
- The kubelet takes a set of PodSpecs that are provided through various mechanisms and ensures that the containers described in those PodSpecs are running and healthy. The kubelet doesn't manage containers which were not created by Kubernetes.

### Kube Proxy

- kube-proxy is a network proxy that runs on each node in your cluster, implementing part of the Kubernetes Service concept.
- kube-proxy maintains network rules on nodes. These network rules allow network communication to your Pods from network sessions inside or outside of your cluster.
-  This reflects services as defined in the Kubernetes API on each node and can do simple TCP, UDP, and SCTP stream forwarding or round robin TCP, UDP, and SCTP forwarding across a set of backends

### Commands

- List all nodes: `kubectl get nodes`

<!-- ### Shutdowns

TODO: Add a bit more information here -->

## Control Plane

- The control plane's components make global decisions about the cluster (for example, scheduling), as well as detecting and responding to cluster events (for example, starting up a new pod when a Deployment's replicas field is unsatisfied)
    - kube-apiserver: Exposes the Kubernetes API.
    - etcd: Consistent and highly-available key value store used as Kubernetes' backing store for all cluster data.
    - kube-scheduler: Control plane component that watches for newly created Pods with no assigned node, and selects a node for them to run on.
    - kube-controller-manager: Runs controller processes
        - Node controller: Responsible for noticing and responding when nodes go down.
        - Job controller: Watches for Job objects that represent one-off tasks, then creates Pods to run those tasks to completion.
        - EndpointSlice controller: Populates EndpointSlice objects (to provide a link between Services and Pods).
        - ServiceAccount controller: Create default ServiceAccounts for new namespaces.
    - cloud-controller-manager: Cloud-specific control logic
- In production environments, the control plane usually runs across multiple computers, and runs separately to the workload

### Kubernetes Scheduler

- The scheduler is responsible for placing different Pods onto different nodes in the cluster.
- The scheduler also uses the Kubernetes API to find Pods that haven’t been scheduled to a node. The scheduler then places the Pods onto nodes depending on the resources and other constraints expressed in the Pod manifests
- Scheduling multiple replicas of the same application onto the same machine is worse for reliability, since the machine is a single failure domain. Consequently, the Kubernetes scheduler tries to ensure that Pods from the same application are distributed onto different machines for reliability in the presence of such failures.
- Once scheduled to a node, Pods don’t move and must be explicitly destroyed and rescheduled.

## DaemonSet

- DaemonSet is a Kubernetes feature that lets you run a Kubernetes pod on all cluster nodes that meet certain criteria. 
- This might be to add an agent to every node (e.g. a log collector).
- Every time a new node is added to a cluster, the pod is added to it, and when a node is removed from the cluster, the pod is removed. When a DaemonSet is deleted, Kubernetes removes all the pods created by it.
- DaemonSets have an equivalent to the
Deployment object that manages a DaemonSet rollout inside the cluster. DaemonSets can be rolled out using the same `RollingUpdate` strategy that deployments
use.
- DaemonSets provide an easy-to-use abstraction for running a set of Pods on every node in a Kubernetes cluster, or, if the case requires it, on a subset of nodes based on labels. 
- The DaemonSet provides its own controller and scheduler to ensure key services like monitoring agents are always up and running on the right nodes in your
cluster.

### Useful commands

- List daemonSets `kubectl get daemonSets`
- Examine a daemonSet `kubectl describe daemonset <name>`

## Ingress

- A critical part of any application is getting network traffic to and from that application.
- The Service object operates at Layer 4 (according to the OSI model). This means that it only forwards TCP and UDP connections and doesn’t look inside of those connections.
- For HTTP (Layer 7)-based services, we can do better.
- When solving a similar problem in non-Kubernetes situations, users often turn to the idea of “virtual hosting.” This is a mechanism to host many HTTP sites on a single IP address. Typically, the user uses a load balancer or reverse proxy to accept incoming connections on HTTP (80) and HTTPS (443) ports. That program then parses the HTTP connection and, based on the Host header and the URL path that is requested, proxies the HTTP call to some other program.
- Kubernetes calls its HTTP-based load-balancing system Ingress.
- The Ingress controller is a software system exposed outside the cluster
using a service of type: LoadBalancer. It then proxies requests to “upstream”
servers. The configuration for how it does this is the result of reading and monitoring
Ingress objects.
- While conceptually simple, at an implementation level Ingress is very different from pretty much every other regular resource object in Kubernetes. Specifically, it is split into a common resource specification (hosted inside the cluster) and a controller implementation (hosted outside the cluster). There is no “standard” Ingress controller that is built into Kubernetes, so the user must install one of many optional implementations.
- To make Ingress work well, you need to configure DNS entries to the external address for your load balancer. You can map multiple hostnames to a single external endpoint and the Ingress controller will play traffic cop and direct incoming requests to the appropriate upstream service based on that hostname.

```
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
    name: path-ingress
spec:
    rules:
    - host: bandicoot.example.com
    http:
        paths:
        - path: "/"
        backend:
            serviceName: bandicoot
            servicePort: 8080
        - path: "/a/"
        backend:
            serviceName: alpaca
            servicePort: 8080
```

## DNS



## Jobs

- A job creates Pods that run until successful termination (i.e., exit with 0).

### Job Object

- The Job object is responsible for creating and managing Pods defined in a template in the job specification.
- The Job object coordinates running a number of Pods in parallel.

### Job Patterns

- One shot (e.g. database migrations): A single pod running once until completions.

```
apiVersion: batch/v1
kind: Job
metadata:
    name: oneshot
spec:
    template:
        spec:
            containers:
                - name: kuard
                image: gcr.io/kuar-demo/kuard-amd64:blue
                imagePullPolicy: Always
                args:
                    - "--keygen-enable"
                    - "--keygen-exit-on-complete"
                    - "--keygen-num-to-gen=10"
                restartPolicy: OnFailure
```

- Parallel fixed computations (e.g. multiple pods processing a set of work in parallel): One or more pods running once until a fixed completion count

```
apiVersion: batch/v1
kind: Job
metadata:
    name: parallel
    labels:
        chapter: jobs
spec:
    parallelism: 5
    completions: 10
    template:
        metadata:
            labels:
                chapter: jobs
        spec:
            containers:
                - name: kuard
                image: gcr.io/kuar-demo/kuard-amd64:blue
                imagePullPolicy: Always
                args:
                    - "--keygen-enable"
                    - "--keygen-exit-on-complete"
                    - "--keygen-num-to-gen=10"
            restartPolicy: OnFailure
```

- Work queue of parallel jobs (e.g. multiple pods processing from a centralized work queue): One or more pods running once until successful termination
    - As the completions
parameter is unset, we put the job into a worker pool mode.

- Cronjobs - sometimes you want to schedule a job to be run at a certain interval.

```
apiVersion: batch/v1beta1
kind: CronJob
metadata:
    name: example-cron
spec:
    # Run every fifth hour
    schedule: "0 */5 * * *"
    jobTemplate:
        spec:
            template:
                spec:
                    containers:
                    - name: batch-job
                    image: my-batch-image
                    restartPolicy: OnFailure
```

------------------------------------------------------------------------------------

# Overview

- Kubernetes is an open source orchestrator for deploying containerized applications.
- Designed to make services:
    - Reliable - Don't fall over
    - Available - Can always be used and are never taken down, on purpose or otherwise
    - Scalable - Can deal with higher traffic, without manual intervention
- Some of the core features:
    - Immutability - We don't incrementally update what is deployed, we just completely replace it
    - Declarative configuration - Deployments are defined by what we want there, not by the steps to create it
    - Online self-healing systems - Kubernetes is constantly adjusting itself to match the declaration

# Concepts

## Images

- Application programs are typically comprised of a language runtime, libraries, and your source code.
    - Language runtimes: The JVM for example
    - Libraries: Things that sit on the OS, e.g. libc and libssl
    - Source code: The code we're actually running
- The most popular container image format is the Docker image format, which has been standardized by the Open Container Initiative to the OCI image format. Kubernetes supports both Docker- and OCI-compatible images via Docker and other runtimes.
- A container image is a binary package that encapsulates all of the files necessary to run a program inside of an OS container.
- Docker images aren't a single file, but are more a way of specifying which other files to pull in.
- We create images by building on previous ones, e.g. A is OS, B adds libraries, C is runtime
- A container image commonly comes with a container configuration, which tells us how to run the image (e.g. docker-compose?)

### Optimizing Image Sizes

- Small image sizes means quicker deployment times.
- Files removed by subsequent Docker layers are still there, they're just inaccessible, leading to larger binary sizes.
- We need to be careful when changing the layers in our image. Everything after a changed layer needs to be updated, meaning we don't get the benefit of the **build cache**.
- **Multistage builds.** With multistage builds, rather than producing a single image, a Docker file can actually produce multiple images. Each image is considered a stage. Artifacts can be copied from preceding stages to the current stage.

### Commands

- List image: `docker images`
- Remove image: `docker rmi <tag-name>`/ `docker rmi <image-id>`

## Containers

- Basically running images

### Commands

- Start a container: `docker run -d --name <friendl-name> --publish <port:port mapping> <image details, e.g. gcr.io/repo/image-name:tag>`
    - Useful flags
        - Limit CPU/ memory (if program in the container uses too much memory, it will be terminated): `--memory 200m --memory-swap 1G --cpu-shares 1024`

## Applications

- The concept of the program you would like to run
- Can be colocated on the same machines without impacting the applications themselves.
- An increase in efficiency comes from the fact that a developer’s test environment can be quickly and cheaply created as a set of containers running in a personal view of a shared Kubernetes cluster using namespaces.

## Kubernetes

### Control plane

### Pods

#### Overview

- A Pod represents a collection of application containers and volumes running in the same execution environment. 
- Pods, not containers, are the smallest deployable artifact in a Kubernetes cluster. This means all of the containers in a Pod always land on the same machine (node).
- An instance of [the sidecar concept](https://learn.microsoft.com/en-us/azure/architecture/patterns/sidecar).

#### Usage

- You will often want to colocate multiple applications into a single atomic unit, scheduled onto a single machine.
- You might want different containers as the different part of your application have different resource requirements, but share something underlying (e.g. storage). We don't want one container to take down the other if it starts gobbling resources.
- Applications running in the same Pod share the same IP address and port space (network namespace), have the same hostname (UTS namespace), and can communicate using native interprocess communication channels over System V IPC or POSIX message queues (IPC namespace). However, applications in different Pods are isolated from each other.
- Only put things on the same pod if they won't work on different machines.

#### Working with Pods

- Pods are described in a Pod manifest. The Pod manifest is just a text-file representation of the Kubernetes API object.
- The Kubernetes API server accepts and processes Pod manifests before storing them in persistent storage (etcd).
- The scheduler also uses the Kubernetes API to find Pods that haven’t been scheduled to a node. The scheduler then places the Pods onto nodes depending on the resources and other constraints expressed in the Pod manifests

#### Healthchecks

- There are three main types of probe: startup, readiness and liveness.
- When you run your application as a container in Kubernetes, it is automatically kept alive for you using a process health check. This health check simply ensures that the main process of your application is always running. If it isn’t, Kubernetes restarts it.
- However, in most cases a health check isn't enough. You also want to check the application is running and responsive (a liveness check).
- You may also want a readiness probe, readiness describes when a container is ready to serve user requests.
- Containers that fail liveness checks are restarted. Containers that fail readiness checks are removed from service load balancers.
- In addition to HTTP checks, Kubernetes also supports tcpSocket health checks that open a TCP socket.
- Finally, Kubernetes allows exec probes. These execute a script or program in the context of the container.

#### Resource Management

- We can use Kubernetes to ensure better utilisation of underlying resources.
- Kubernetes allows users to specify two different resource metrics. 
    - Resource requests specify the minimum amount of a resource required to run the application.
        - Kubernetes guarantees that these resources are available to the Pod, it's a resource minimum.
        - Requests are used when scheduling Pods to nodes. The Kubernetes scheduler will ensure that the sum of all requests of all Pods on a node does not exceed the capacity of the node.
    - Resource limits specify the maximum amount of a resource that an application can consume.

#### Volumes

- You can use volumes for 
    - Communicating between two containers in the same pod
    - Caching (e.g. storing computed thumbnail images)
    - Genuinely persisted data
- You can use the host's file system via `hostPath`.
- You can use remote disks with NFS and iSCSI as well as cloud provider-based storage APIs
- Different types of volumes: persisted, projected, ephemeral

#### Manifest

- Example manifest (applied with `kubectl apply -f <file-name>.yaml`)

```
apiVersion: v1
kind: Pod
metadata:
    name: kuard
    spec:
        volumes:
            - name: "kuard-data"
              nfs:
              server: my.nfs.server.local
              path: "/exports"
        containers:
            - image: "gcr.io/kuar-demo/kuard-amd64:blue"
              name: "kuard"
              ports:
                  - containerPort: 8080
                    name: http
                    protocol: TCP
              resources:
                  requests:
                      cpu: "500m"
                      memory: "128Mi"
                  limits:
                      cpu: "1000m"
                      memory: "256Mi"
        volumeMounts:
            - mountPath: "/data"
              name: "kuard-data"
        livenessProbe:
            httpGet:
                path: /healthy
                port: 8080
                initialDelaySeconds: 5
                timeoutSeconds: 1
                periodSeconds: 10
                failureThreshold: 3
        readinessProbe:
            httpGet:
                path: /ready
                port: 8080
                initialDelaySeconds: 30
                timeoutSeconds: 1
                periodSeconds: 10
                failureThreshold: 3
```

#### Sidecars

- Kubernetes implements sidecar containers as a special case of init containers; sidecar containers remain running after Pod startup.
- Normal init containers will just run on start up, do a job, then finish.
- If an init container is created with its restartPolicy set to Always, it will start and remain running during the entire life of the Pod. This can be helpful for running supporting services separated from the main application containers.
- The benefit of a sidecar container being independent from other init containers (without restart policy always) and from the main application container(s) within the same pod. These can be started, stopped, or restarted without affecting the main application container and other init containers.
- If a readinessProbe is specified for this init container, its result will be used to determine the ready state of the Pod.
- You can reuse sidecar containers for multiple applications (e.g. logging, running a server for SSL termination)
- https://kodekloud.com/blog/kubernetes-sidecar-container/

#### Commands

- View logs: `kubectl logs <pod-name>`
    - Useful flags 
        Select container in pod: `-c`
- Start interactive shell in container: `kubectl exec -it <pod-name> -- bash`
- Attach to and send commands to running process (as long as it runs from standard input): `kubectl attach -it <pod-name>`
- Copy files to and from container: `kubectl cp <pod-name>:</path/to/remote/file> </path/to/local/file>`
- Forward ports: `kubectl port-forward <pod-name> <local-port>:<pod-port>`
- List of resources used by pods: `kubectl top pods`
- Create a pod: `kubectl run NAME --image=<image>`
- See events for a pod: `kubectl describe pod <name-of-pod>`
- Get pod by label: `kubectl get pods -l key=value`

### Services

- Provide load balancing, naming, and discovery to isolate one microservice from another.

#### Service Discovery

- Service discovery tools help solve the problem of finding which processes are listening at which addresses for which services.
- The Domain Name System (DNS) is the traditional system of service discovery on the internet.
- A Service object is a way to create a named label selector.
- A service is assigned a new type of virtual IP called a cluster IP. This is a special IP address the system will load-balance across all of the Pods that are identified by the selector.
- Because the cluster IP is virtual, it is stable, and it is appropriate to give it a DNS address.
- Kubernetes provides a DNS service exposed to Pods running in the cluster.
- Within a namespace, it is as easy as just using the service name to connect to one of the Pods identified by a service.
- The Service object does is track which of your Pods are ready via a readiness check.
- NodePorts: In addition to a cluster IP, the system picks a port (or the user can specify one), and every node in the cluster then forwards traffic to that port to the service. With this feature, if you can reach any node in the cluster you can contact a service
- If you have support from the cloud that you are running on (and your cluster is configured to take advantage of it), you can use the LoadBalancer type. This builds on the NodePort type by additionally configuring the cloud to create a new load balancer and direct it at nodes in your cluster.

##### Kube Proxy

- Cluster IPs are stable virtual IPs that load-balance traffic across all of the endpoints in a service. This magic is performed by a component running on every node in the cluster called the kube-proxy
- The kube-proxy watches for new services in the cluster via the API server. It then programs a set of iptables rules in the kernel of that host to rewrite the destinations of packets so they are directed at one of the endpoints for that service.

#### Commands

- Expose service: `kubectl expose <object-type> <object-name>`
- See endpoints: `kubectl get endpoints <deployment>`

### Endpoints

- Pods expose themselves through endpoints to a service. It is if you will part of a pod.

### Namespaces

- Provide isolation and access control, so that each microservice can control the degree to which other services interact with it.
- A namespace in Kubernetes is an entity for organizing Kubernetes resources. You can think of it like a folder in a filesystem.
- Namespaces are intended for use in environments with many users spread across multiple teams, or projects. For clusters with a few to tens of users, you should not need to create or think about namespaces at all. Start using namespaces when you need the features they provide.
- Namespaces provide a scope for names. Names of resources need to be unique within a namespace, but not across namespaces. Namespaces cannot be nested inside one another and each Kubernetes resource can only be in one namespace.
- Namespaces are a way to divide cluster resources between multiple users (via resource quota).

#### Commands

- By default, the kubectl commandline tool interacts with the default namespace. If you want to use a different namespace, you can pass kubectl the `--namespace` flag.

### Contexts

- A Kubernetes context is a set of configuration parameters that define which Kubernetes cluster you are interacting with, which user you are using to access it, and which namespace you are working within.
- It basically prevents you having to specify these things with every command (e.g. no need for `-n <namespace>` on each command).
- A "cluster" is a group of physical machines working together as a single system, while a "namespace" is a logical division within that cluster.
- If you want to change the default namespace more permanently, you can use a context.
- This gets recorded in a kubectl configuration file, usually located at `$HOME/.kube/config`.
- Configuration file also stores how to both find and authenticate to your cluster.
- The kubernetes concept (and term) context only applies in the kubernetes client-side, i.e. the place where you run the kubectl command, e.g. your command prompt. The kubernetes server-side doesn't recognise this term 'context'. This is different to namespacesm which exist server-side.

#### Commands

- Create a context with different default namespace: `kubectl config set-context <context-name> --namespace=<namespace>`.
- Start using your new context: `kubectl config use-context <context-name>`

### Objects

- Everything in Kubernetes is represented by a REST resource
- Objects in the Kubernetes API are represented as JSON or YAML files.

#### CRUD operations

#### Commands

- List all resources in current namespace: `kubectl get <resource-name>` (e.g. `kubectl get pods`).
- Get a specific resource: `kubectl get <resource-name> <obj-name>`.
    - Useful flags:
        - More details: `-o wide`
        - View the objects as raw JSON or YAML: `-o json` or `-o yaml`
        - Remove headers: `--no-headers`
        - Manipulate output via JSON path: `-o jsonpath --template=<template, e.g. {.status.podIP}>`
- Create/ update a resource from a yaml file: `kubectl apply -f obj.yaml`
    - Useful flags:
        - See update: `--dry-run`
- Update a resource interactively: `kubectl edit <resource-name> <obj-name>`
- View last applied state: `kubectl apply -f myobj.yaml view-last-applied`
- Delete an object by yaml: `kubectl delete -f obj.yaml`
- Delete an object by name: `kubectl delete <resource-name> <obj-name>`

### Ingress

- Provide an easy-to-use frontend that can combine multiple microservices into a single externalized API surface area.
- Basically an API gateway
- The Service object operates at Layer 4 (according to the OSI model1). This means that it only forwards TCP and UDP connections and doesn’t look inside of those connections.
- For HTTP (Layer 7)-based services, we can do better. Ingress is a Kubernetes-native way to implement the “virtual hosting” pattern, basically an API gateway allowing you to route different requests to different services depending on the content (e.g. path).
- The Ingress controller is a software system exposed outside the cluster using a service of type: LoadBalancer.
- There is no “standard” Ingress controller that is built into Kubernetes, so the user must install one of many optional implementations.

### Nodes

- Physical machines that Kubernetes runs on.
- Nodes are separated into master nodes (core processes, e.g. scheduler) and worker nodes (your application).

#### Commands

- List all nodes in cluster: `kubectl get nodes`.
- Get information on particular node: `kubectl describe nodes <node-name>`
- List of resources used by nodes: `kubectl top nodes`

### Labels and Annotations

- Labels and annotations are tags for your objects.
- Way of identifying different objects in the same namespace.

#### Commands

- Add a label: `kubectl label <resource-name> <obj-name> <label-name>=<label-value>`
- Remove a label: `kubectl label <resource-name> <obj-name> <label-name>-`

### kubectl

- The official Kubernetes client is kubectl: a command-line tool for interacting with the Kubernetes API. 
- kubectl can be used to manage most Kubernetes objects, such as Pods, ReplicaSets, and Services.

#### Commands

- Check version of cluster you're running: `kubectl version`
- Simple diagnostic for the cluster: `kubectl get componentstatuses`

### Controller Manager

- Responsible for running various controllers that regulate behavior in the cluster.

### Scheduler

- The scheduler is responsible for placing different Pods onto different nodes in the cluster.
- The scheduler also uses the Kubernetes API to find Pods that haven’t been scheduled to a node. The scheduler then places the Pods onto nodes depending on the resources and other constraints expressed in the Pod manifests
- Scheduling multiple replicas of the same application onto the same machine is worse for reliability, since the machine is a single failure domain. Consequently, the Kubernetes scheduler tries to ensure that Pods from the same application are distributed onto different machines for reliability in the presence of such failures.
- Once scheduled to a node, Pods don’t move and must be explicitly destroyed and rescheduled.

### etcd server

- The `etcd` server is the storage for the cluster where all of the API objects are stored.
- Consistent and highly-available key value store used as Kubernetes' backing store for all cluster data.

#### kubelet

- Kubernetes containers are launched by a daemon running on the node called a kubelet.

#### kube-dns

- Local DNS server which is used for routing to services in the cluster.
- What is core DNS?

#### kube-proxy

- Kubernetes proxy routes traffic to load balanced services in the cluster. It's on each node.
kube-proxy is a network proxy that runs on each node in your cluster, implementing part of the Kubernetes Service concept.

kube-proxy maintains network rules on nodes. These network rules allow network communication to your Pods from network sessions inside or outside of your cluster.

kube-proxy uses the operating system packet filtering layer if there is one and it's available. Otherwise, kube-proxy forwards the traffic itself.

If you use a network plugin that implements packet forwarding for Services by itself, and providing equivalent behavior to kube-proxy, then you do not need to run kube-proxy on the nodes in your cluster.


##### Commands

- List proxies `kubectl get daemonSets --namespace=<namespace> kube-proxy`

### UI

- How to visually interact with Kubernetes

##### Commands

- Launch UI (starts up a server running on localhost:8001): `kubectl proxy`

# Kind

After creating a cluster, you can use kubectl to interact with it by using the configuration file generated by kind.

`kind create cluster`
`kind create cluster --config=kind-config.yaml`
`kind get clusters`
`kind delete cluster`

We can use this to view the current context, and see that it's set as `kind-kind`.
`kubectl config current-context`

Load an image into your cluster

`kind load docker-image my-custom-image:unique-tag`

```
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
EOF
```

`kind load docker-image kubernetes-next-app:1.0.0`

`kubectl apply -f kubernetes-next-app-manifest.yaml`

`kubectl port-forward kubernetes-next-app 3000:3000`

`kubectl exec --stdin --tty kubernetes-next-app /bin/sh`

`apk --no-cache add curl`

`kubectl port-forward kubernetes-next-app 3000:3000`

`kubectl port-forward svc/kubernetes-next-app-service 3000:3000`
`kubectl port-forward ingress/example-ingress 3000:3000`

`docker exec -it kind-control-plane iptables-save | grep 3000`

1. Create cluster: `kind create cluster --config=kind-config.yaml`
2. Upload docker image: `kind load docker-image kubernetes-next-app:1.0.0`
3. Create pod: `kubectl apply -f kubernetes-next-app-manifest.yaml`
4. Check what's running on control plane: `docker exec -it kind-control-plane iptables-save | grep 3000`
5. Check service is exposing port: `kubectl get svc kubernetes-next-app-service`
6. Check pod logs: `kubectl logs kubernetes-next-app`
7. Check labels: `kubectl get pods  --show-labels`
8. Try port forwarding: `kubectl port-forward svc/kubernetes-next-app-service 3000:30000`

# Creating Image

`npx create-next-app@latest`
Image size - `docker image ls <image-name>` 
`.dockerignore` tells Docker to ignore copying over certain files or folders on your filesystem when building the image.
Build image `docker build -t image_name:tag_name .` e.g. `docker build -t kubernetes-next-app:1.0.0 .`
List docker images `docker images`
List docker containers `docker ps`
Run docker container `docker run image_name:tag_name` interactively is `-it`, map ports `-p 3000:3000`, e.g. `docker run -p 3000:3000 kubernetes-next-app`


----------------------------------------------------------------------------------------------------------------------------------------

# Structure

## Images

### Overview

### Optimizing Image Sizes

### Containers

- As well as the phase of the Pod overall, Kubernetes tracks the state of each container inside a Pod. You can use container lifecycle hooks to trigger events to run at certain points in a container's lifecycle.
- Once the scheduler assigns a Pod to a Node, the kubelet starts creating containers for that Pod using a container runtime. There are three possible container states: Waiting, Running, and Terminated.
- Kubernetes manages containers using a [restart policy](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-restarts) defined in the spec.

## Context

## Namespace

## Labels and annotations

- Difference between context, namespace, labels and annotations
- Label selectors are used to filter Kubernetes objects based on a set of labels.
- Annotations are used to provide extra information about where an object came from, how to use it, or policy around that object.
- Annotations are used in various places in Kubernetes, with the primary use case being rolling deployments. During rolling deployments, annotations are used to track rollout status and provide the necessary information required to roll back a deployment to a previous state.
- Annotation keys use the same format as label keys. However, because they are often used to communicate information between tools.
- The value component of an annotation is a free-form string field. While this allows maximum flexibility as users can store arbitrary data, because this is arbitrary text, there is no validation of any format. For example, it is not uncommon for a JSON document to be encoded as a string and stored in an annotation.

### Commands

- `kubectl label <object-type> <object-name> "key=value"`
- `kubectl get <object-type> --selector="key=value"`

## Pods

### Probes

- Startup, readiness and liveness
- [Types of probe (exec, grpc, httpGet, tcpSocket)](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)

### Lifecycle

- Pods follow a defined lifecycle, starting in the Pending phase, moving through Running if at least one of its primary containers starts OK, and then through either the Succeeded or Failed phases depending on whether any container in the Pod terminated in failure.
- Whilst a Pod is running, the kubelet is able to restart containers to handle some kind of faults. 
- Pods are only scheduled once in their lifetime; assigning a Pod to a specific node is called binding, and the process of selecting which node to use is called scheduling.
- Once a Pod has been scheduled and is bound to a node, Kubernetes tries to run that Pod on the node. 

## Deployments

- A Kubernetes deployment is a resource object in Kubernetes that provides declarative updates to applications. A deployment allows you to describe an application’s life cycle, such as which images to use for the app, the number of pods there should be, and the way in which they should be updated.
- A ReplicaSet's purpose is to maintain a stable set of replica Pods running at any given time. Usually, you define a Deployment and let that Deployment manage ReplicaSets automatically.
- Roll out status?

## Volumes

- There are many [different types](https://kubernetes.io/docs/concepts/storage/volumes/).

## Replica Sets

### Observability

## Nodes

### Shutdowns

## Control Plane

- Kubernetes uses a higher-level abstraction, called a controller, that handles the work of managing the relatively disposable Pod instances.

### Kubernetes Scheduler

## DaemonSet

- DaemonSet is a Kubernetes feature that lets you run a Kubernetes pod on all cluster nodes that meet certain criteria. Every time a new node is added to a cluster, the pod is added to it, and when a node is removed from the cluster, the pod is removed. When a DaemonSet is deleted, Kubernetes removes all the pods created by it.

## Security

## Configuration

### ConfigMaps

### Secrets

## Ingress

### Ingress Controllers

# Tasks

## Set up Kind cluster

We can create a cluster with

`kind create cluster --config=kind-config.yaml`

This will [generate a configuration file](https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/) at `${HOME}/.kube/config`. This allows you to access the cluster via `kubectl`.

Once we're done, we can delete the cluster with:

`kind delete cluster`

## Run image on a pod in a cluster

Now we have our cluster up and running we can get our image running on a pod within it.

1. Build the image: `docker build -t kubernetes-next-app:1.0.0 .`
1. Load the image into the cluster: `kind load docker-image kubernetes-next-app:1.0.0`
1. Run the image as a container on the pod, and expose it via a service: `kubectl apply -f kubernetes-next-app-manifest.yaml`
1. Check the pod is up and running: `kubectl get pods -o wide`
1. Check the pod logs: `kubectl logs kubernetes-next-app`
1. Check service is up and running: `kubectl get svc kubernetes-next-app-service`
1. Forward your local port to the service: `kubectl port-forward svc/kubernetes-next-app-service 3000:3000`
1. Visit the running image locally: `localhost:3000`

## Make the image part of a deployment

1. Run the image as part of a replica set defined by a deployment: `kubectl apply -f kubernetes-next-app-manifest.yaml`
1. Check the rollout status of the deployment `kubectl rollout status deployment/kubernetes-next-app-deployment`
1. Check the pods in the replica set are up and running: `kubectl get pods -o wide`
1. List all deployments: `kubectl get deployments`
1. List all replica sets: `kubectl get rs`
1. Delete the pod we created manually: `kubectl delete pod kubernetes-next-app`
1. Choose a pod by name from this list: `kubectl get pods -o wide`
1. Manually delete a pod: `kubectl delete pod kubernetes-next-app-deployment-6cb5c88748-dr7qz`
1. Check another one has taken its place: `kubectl get pods -o wide`
1. List all deployments: `kubectl get deployments`
1. Interactively change the number of replicas to two: `kubectl edit deployments kubernetes-next-app-deployment`
1. Check the number of pods has decreased: `kubectl get pods -o wide`
1. Forward your local port to the service: `kubectl port-forward svc/kubernetes-next-app-service 3000:3000`
1. Visit the running image locally: `localhost:3000`

## Add a volume to the pod

- [Tutorial](https://kubernetes.io/docs/tasks/configure-pod-container/configure-persistent-volume-storage/)
- [How to SSH onto a node](https://stackoverflow.com/questions/69108075/how-to-ssh-into-kind-cluster-nodes-with-containerd-runtime)
- kubectl exec --stdin --tty kubernetes-next-app-deployment-69db954778-j8s5t /bin/sh

## Add a sidecar

## Set up an HPA

----

List of Kubernetes terms



Daemon sets
    DaemonSet is a Kubernetes feature that lets you run a Kubernetes pod on all cluster nodes that meet certain criteria. Every time a new node is added to a cluster, the pod is added to it, and when a node is removed from the cluster, the pod is removed. When a DaemonSet is deleted, Kubernetes removes all the pods created by it.
Node shutdowns
Metrics/ Logs
Control plane
Probes: Liveness, readiness, start up
Security
Kubernetes scheduler
Configuration
    ConfigMaps
    Secrets
Ingress and ingress controllers
Rollouts
    Argo
Deployments
Rollouts
Roll backs
Secrets
Services
Namespaces
    By default, the kubectl commandline tool interacts with the default namespace.
    Change with `kubectl --namespace=mystuff`
Replica sets
Controller manager
Sidecars
    https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
Ephemeral containers
    https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
Scheduler
Etcd0
Pods
    `$ kubectl get pods my-pod -o jsonpath --template={.status.podIP}` to describe a particular pod
Kubernetes proxy
Kubernetes DNS
Kubernetes context
    If you want to change the default namespace more permanently, you can use a context.
    Create context `$ kubectl config set-context my-context --namespace=mystuff`
    Switch context `$ kubectl config use-context my-context`
Resources
    If you run `kubectl get <resource-name>` you will get a listing of all resources in the current namespace. Should this be namespace?
    Can use `kubectl describe <resource-name> <obj-name>` to get a particular resource
CRUD for objects
    Let’s assume that you have a simple object stored in obj.yaml. You can use kubectl to create/ update this object in Kubernetes by running: `kubectl apply -f obj.yaml`. Can use `--dry-run` to test what it will do.
    See history `$ kubectl apply -f myobj.yaml view-last-applied`
    If you feel like making interactive edits instead of editing a local file, you can instead use the edit command, which will download the latest object state and then launch an editor that contains the definition: `$ kubectl edit`
    When you want to delete an object, you can simply run: `$ kubectl delete -f obj.yaml`. Likewise, you can delete an object using the resource type and name: `$ kubectl delete <resource-name> <obj-name>`
Labels and annotations
    Labels and annotations are tags for your objects.
How does DNS work?

Useful diagrams
    https://kubernetes.io/docs/concepts/architecture/

