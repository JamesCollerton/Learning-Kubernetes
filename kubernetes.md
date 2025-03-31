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

#### Kubernetes proxy

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

