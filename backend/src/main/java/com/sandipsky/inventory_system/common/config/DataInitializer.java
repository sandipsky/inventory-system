package com.sandipsky.inventory_system.common.config;

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
    }
}
