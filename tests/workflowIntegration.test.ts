import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/database/prisma";

describe("Workflow End-to-End Integration", () => {
  const testProjectId = "test-workflow-proj-01";
  const testSurveyId = "test-workflow-survey-01";

  afterEach(async () => {
    // Clean up test data
    try {
      await prisma.project.deleteMany({ where: { id: testProjectId } });
      await prisma.homeSurvey.deleteMany({ where: { id: testSurveyId } });
    } catch {}
  });

  it("should persist and retrieve the complete workflow state in database", async () => {
    // 1. Create project
    const project = await prisma.project.create({
      data: {
        id: testProjectId,
        name: "Dự án khảo sát kiểm thử Tự Động",
        description: "Bác Nam 75 tuổi, đi lại chậm",
      },
    });

    expect(project.id).toBe(testProjectId);

    // 2. Create home and room
    const home = await prisma.home.create({
      data: {
        projectId: project.id,
        name: "Căn hộ số 502",
        targetResidentProfile: "Bác Nam 75 tuổi",
      },
    });

    const room = await prisma.room.create({
      data: {
        homeId: home.id,
        name: "Phòng ngủ người cao tuổi",
        roomType: "BEDROOM",
        width: 3.5,
        length: 4.5,
        height: 2.8,
      },
    });

    // 3. Create Scene Objects
    const obj1 = await prisma.sceneObject.create({
      data: {
        roomId: room.id,
        name: "Thảm trải sàn cạnh giường",
        category: "RUG",
        modelType: "rug",
        positionX: 0.5,
        positionY: 0.02,
        positionZ: -0.6,
        isLoose: true,
      },
    });

    expect(obj1.name).toContain("Thảm");

    // 4. Create HomeSurvey audit
    const survey = await prisma.homeSurvey.create({
      data: {
        id: testSurveyId,
        name: "Khảo sát an toàn phòng ngủ",
        status: "SCENE_READY",
      },
    });

    expect(survey.status).toBe("SCENE_READY");

    // 5. Query back room with sceneObjects
    const fetchedRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: { sceneObjects: true },
    });

    expect(fetchedRoom).toBeDefined();
    expect(fetchedRoom?.sceneObjects.length).toBe(1);
    expect(fetchedRoom?.sceneObjects[0].isLoose).toBe(true);
  });
});

