package com.sandipsky.inventory_system.features.user.services;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;
import com.sandipsky.inventory_system.features.user.dtos.UserDTO;
import com.sandipsky.inventory_system.features.user.entities.User;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.role_operations.entities.Role;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.DuplicateResourceException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.role_operations.repositories.RoleRepository;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository repository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Same folder WebConfig serves at /uploads/**
    @Value("${file.upload-dir}")
    private String uploadDir;

    private static final String IMAGE_URL_PREFIX = "/uploads/";
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");

    private final SpecificationBuilder<User> specBuilder = new SpecificationBuilder<>();

    @Transactional
    public User saveUser(UserDTO dto, MultipartFile imageFile) {
        if (repository.existsByUsername(dto.getUsername())) {
            throw new DuplicateResourceException("Username already exists");
        }
        if (repository.existsByEmail(dto.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        User user = new User();
        mapDtoToEntity(dto, user);
        if (imageFile != null && !imageFile.isEmpty()) {
            String imageUrl = saveImageFile(imageFile);
            user.setImageUrl(imageUrl);
        }
        return repository.save(user);
    }

    public Page<UserDTO> getPaginatedUsersList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Specification<User> spec = specBuilder.buildSpecification(QueryParamUtil.toFilterParams(params));
        Page<User> productPage = repository.findAll(spec, pageable);
        return productPage.map(this::mapToDTO);
    }

    public UserDTO getUserById(int id) {
        User user = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapToDTO(user);
    }

    public User updateUser(int id, UserDTO dto, MultipartFile imageFile) {
        User existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (repository.existsByUsernameAndIdNot(dto.getUsername(), id)) {
            throw new DuplicateResourceException("Username already exists");
        }

        if (repository.existsByEmailAndIdNot(dto.getEmail(), id)) {
            throw new DuplicateResourceException("Email already exists");
        }

        mapDtoToEntity(dto, existing);
        if (imageFile != null && !imageFile.isEmpty()) {
            // Save the new image first so a rejected upload keeps the old one
            String imageUrl = saveImageFile(imageFile);
            deleteImageFileIfExists(existing.getImageUrl());
            existing.setImageUrl(imageUrl);
        }
        return repository.save(existing);
    }

    public void deleteUser(int id) {
        User user = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        deleteImageFileIfExists(user.getImageUrl());
        repository.deleteById(id);
    }

    private UserDTO mapToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPassword("");
        dto.setGender(user.getGender());
        dto.setRemarks(user.getRemarks());
        dto.setContact(user.getContact());
        dto.setActive(user.isActive());
        if (user.getRole() != null) {
            dto.setRoleId(user.getRole().getId());
            dto.setRoleName(user.getRole().getName());
        }
        dto.setImageUrl(user.getImageUrl());
        return dto;
    }

    private void mapDtoToEntity(UserDTO dto, User user) {
        user.setUsername(dto.getUsername().trim());
        user.setFullName(dto.getFullName());
        user.setEmail(dto.getEmail().trim());
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
        user.setGender(dto.getGender());
        user.setContact(dto.getContact());
        user.setActive(dto.isActive());
        user.setRemarks(dto.getRemarks());
        if (dto.getRoleId() != null && dto.getRoleId() > 0) {
            Role role = roleRepository.findById(dto.getRoleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
            user.setRole(role);
        } else {
            user.setRole(null);
        }
    }

    private String saveImageFile(MultipartFile file) {
        String extension = imageExtension(file.getOriginalFilename());
        try {
            Path usersDir = Paths.get(uploadDir, "users");
            Files.createDirectories(usersDir);

            // Generated name: uploads never overwrite each other and the client's
            // filename can't point outside the upload folder
            String fileName = UUID.randomUUID() + "." + extension;
            Files.copy(file.getInputStream(), usersDir.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);

            return IMAGE_URL_PREFIX + "users/" + fileName; // e.g. /uploads/users/3f2a...c9.png
        } catch (IOException e) {
            throw new RuntimeException("Failed to save image file", e);
        }
    }

    private String imageExtension(String originalFilename) {
        String name = originalFilename == null ? "" : originalFilename;
        String extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!name.contains(".") || !IMAGE_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Image must be a JPG, PNG, GIF or WEBP file");
        }
        return extension;
    }

    private void deleteImageFileIfExists(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith(IMAGE_URL_PREFIX)) {
            return;
        }
        try {
            Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = root.resolve(imageUrl.substring(IMAGE_URL_PREFIX.length())).normalize();
            if (filePath.startsWith(root)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException e) {
            // Optionally log warning but don't block main flow
            System.err.println("Failed to delete image file: " + e.getMessage());
        }
    }
}
