package com.hostelfinder.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
  private final String uploadDir;

  public StaticResourceConfig(@Value("${app.upload.dir}") String uploadDir) {
    this.uploadDir = uploadDir;
  }

  @Override
  public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
    Path p = Paths.get(uploadDir).toAbsolutePath().normalize();
    registry.addResourceHandler("/uploads/**")
        .addResourceLocations(p.toUri().toString());
  }

  @Override
  public void addViewControllers(@NonNull ViewControllerRegistry registry) {
    registry.addRedirectViewController("/", "/pages/index.html");
  }
}
