package com.upcn.formu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class FormuApplication {

    public static void main(String[] args) {
        SpringApplication.run(FormuApplication.class, args);
    }
}
