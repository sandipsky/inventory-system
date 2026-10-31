package com.sandipsky.inventory_system.features.settings.configuration.repositories;
import com.sandipsky.inventory_system.features.settings.configuration.entities.Configuration;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;


public interface ConfigurationRepository
        extends JpaRepository<Configuration, Integer>, JpaSpecificationExecutor<Configuration> {

    Optional<Configuration> findByName(String name);
}
