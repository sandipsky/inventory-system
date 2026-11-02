package com.sandipsky.inventory_system.common.config;

import com.sandipsky.inventory_system.features.notification.services.LowStockService;
import com.sandipsky.inventory_system.features.settings.configuration.entities.Configuration;
import com.sandipsky.inventory_system.features.settings.configuration.repositories.ConfigurationRepository;
import com.sandipsky.inventory_system.features.user.dtos.UserDTO;
import com.sandipsky.inventory_system.features.role_operations.repositories.RoleRepository;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;
import com.sandipsky.inventory_system.features.user.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ConfigurationRepository configurationRepository;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername("admin") && !userRepository.existsByEmail("admin@admin.com")) {
            UserDTO adminDto = new UserDTO();
            adminDto.setUsername("admin");
            adminDto.setEmail("admin@admin.com");
            adminDto.setFullName("Admin");
            adminDto.setPassword("Admin@123");
            adminDto.setGender("Other"); // or null or any appropriate value
            adminDto.setContact("0000000000"); // default
            adminDto.setActive(true);
            adminDto.setRemarks("Admin User");
            roleRepository.findByName("Admin").ifPresent(r -> adminDto.setRoleId(r.getId()));
            userService.saveUser(adminDto, null);
        }

        // Databases created before low stock notifications lack the setting (database.sql seeds it)
        if (configurationRepository.findByName(LowStockService.SETTING).isEmpty()) {
            Configuration lowStock = new Configuration();
            lowStock.setName(LowStockService.SETTING);
            lowStock.setLabel("Low Stock Quantity");
            lowStock.setValue("10");
            configurationRepository.save(lowStock);
        }
    }
}
