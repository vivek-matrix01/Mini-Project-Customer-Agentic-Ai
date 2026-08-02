package com.mini.project.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.Executor;

/**
 * RestConfig — Phase 3 Upgrade
 *
 * WHAT CHANGED:
 *  1. Added @EnableAsync — activates Spring's @Async processing.
 *     Without this annotation, @Async methods run synchronously (the bug
 *     everyone forgets about when first using @Async).
 *  2. Defined a named ThreadPoolTaskExecutor bean "taskExecutor"
 *     so Spring uses our configured pool instead of a default SimpleAsyncTaskExecutor.
 *     SimpleAsyncTaskExecutor creates a NEW thread for every task — a resource leak
 *     under load. A bounded pool with a queue is production-safe.
 *  3. RestTemplate is now a Spring-managed bean (was newed inline in ReviewService).
 *     Being a bean allows future customization: timeouts, interceptors, etc.
 */
@EnableAsync
@Configuration
public class RestConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    /**
     * Bounded thread pool for @Async tasks (AI enrichment, etc.)
     * - corePoolSize 4  : always 4 threads ready
     * - maxPoolSize  10 : burst up to 10 under load
     * - queueCapacity 100 : queue up to 100 tasks before rejecting
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("nexus-async-");
        executor.initialize();
        return executor;
    }
}
