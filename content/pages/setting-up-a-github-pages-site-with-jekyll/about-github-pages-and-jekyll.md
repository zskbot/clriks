## Description

This proposal aims to integrate with [cache mount](https://docs.docker.com/build/guide/mounts/#add-a-cache-mount) caching mechanisms to enhance the performance of devcontainer builds. Rebuilding devcontainers frequently is a common practice due to various factors, such as frequently working on different projects, upgrading tool version or editing devcontainer specification. To address this issue, Buildkit introduced the `RUN --mount` feature to fix practice such as `apk add --no-cache` or `rm -rf /var/cache/apt/archives /var/lib/apt/lists/*`, which is actually utilized by the devcontainer building script for mounting features scripts. Exposing an API for features to leverage the cache mount would be beneficial for caching directories like `/var/cache/apt/archives`.

## Motivation

Building containers can be a resource-intensive process, both in terms of compute and network resources. A notable example is installing home-manager in a container where a significant amount of developer experience programs are shared, such as oh my zsh configurations, custom shells, and versioning tooling. All of these contributions can increase the container size by gigabytes. The only known solution to this issue is to move the some steps towards hooks, as demonstrated in [my script](https://github.com/shikanime/features/blob/bc079ef1c701abcc81c49d1ff1f250b1326de9f6/src/catbox/install.sh#L52-L74) and [Ken Muse's article](https://www.kenmuse.com/blog/improving-dev-container-feature-performance/). This approach allows for offloading the build task to hooks and utilizing mounts.

## Proposed Solution

To address the aforementioned concerns, I propose introducing a new configuration option in the specification to enable the configuration of one or more mount type caches such as:

```json
{
  "build": {
    "mounts": [
      {"type": "cache", "id": "apt-cache", "target": "/var/cache/apt/archives" }
    ]
  }
}
```

## Implementation Challenges

While this proposal addresses the integration of caching mechanisms for devcontainer builds, it doesn't encompass solutions for user relative cache directories like local `$HOME/.cache/pip` directories under user home paths. It primarily solve global caching mechanisms, such as `/var/cache`.

Furthermore, the distinction between runtime and build-time caching should be carefully considered. Installing dependencies during the install.sh phase allows for immediate access to those dependencies for dependent features, while utilizing hooks enables caching to be shared with the user's runtime environment.