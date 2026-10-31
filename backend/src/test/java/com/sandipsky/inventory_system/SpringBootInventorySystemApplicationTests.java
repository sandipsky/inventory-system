package com.sandipsky.inventory_system;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// Keep test data inside target/ — never touch the real database or uploads
@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:sqlite:target/test-inventory_system.db",
		"file.upload-dir=target/test-uploads/"
})
class SpringBootInventorySystemApplicationTests {

	@Test
	void contextLoads() {
	}

}
