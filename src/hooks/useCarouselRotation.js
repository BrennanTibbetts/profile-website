import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Custom hook to manage 3D carousel rotation animation
 * Handles smooth interpolation between slides and drag offset
 * 
 * @param {number} slideIndex - Current slide index
 * @param {Object} dragOffsetRef - Reference to current drag offset
 * @param {number} numItems - Total number of carousel items
 * @param {number} radius - Carousel radius (default: 3.5)
 * @param {Object} options - Intro animation options
 * @returns {Object} Group ref, position/rotation helpers
 */
export function useCarouselRotation(slideIndex, dragOffsetRef, numItems, radius = 3.5, options = {}) {
  const groupRef = useRef();
  const isInitialized = useRef(false);
  const [renderRadius, setRenderRadius] = useState(radius);
  const animatedRadiusRef = useRef(radius);
  const renderedRadiusRef = useRef(radius);
  const introSpeed = Math.max(0.1, options.introSpeed ?? 2.8);
  const introStartRadius = options.introStartRadius ?? Math.max(0.5, radius * 0.45);
  const introStartRadiusRef = useRef(introStartRadius);
  const introRunKey = options.introRunKey ?? 0;

  useEffect(() => {
    introStartRadiusRef.current = introStartRadius;
  }, [introStartRadius]);

  useEffect(() => {
    animatedRadiusRef.current = introStartRadiusRef.current;
    renderedRadiusRef.current = introStartRadiusRef.current;
    setRenderRadius(introStartRadiusRef.current);
  }, [introRunKey]);

  /**
   * Calculate 3D position for an item at given index
   * @param {number} index - Item index
   * @param {number} yOffset - Vertical offset (default: 0)
   * @returns {Array} [x, y, z] position
   */
  const getPosition = (index, yOffset = 0) => {
    const angle = index * ((2 * Math.PI) / numItems);
    return [renderRadius * Math.sin(angle), yOffset, renderRadius * Math.cos(angle)];
  };

  /**
   * Calculate rotation for an item at given index
   * @param {number} index - Item index
   * @returns {Array} [x, y, z] rotation in radians
   */
  const getRotation = (index) => {
    const angle = index * ((2 * Math.PI) / numItems);
    return [0, angle, 0];
  };

  // Animation frame handler for smooth rotation
  useFrame((state, delta) => {
    const targetRotation = -slideIndex * ((2 * Math.PI) / numItems);
    const currentTarget = targetRotation + (dragOffsetRef?.current || 0);
    const targetRadius = radius;
    const nextRadius = THREE.MathUtils.damp(animatedRadiusRef.current, targetRadius, introSpeed, delta);

    if (Math.abs(nextRadius - renderedRadiusRef.current) > 0.0008) {
      animatedRadiusRef.current = nextRadius;
      renderedRadiusRef.current = nextRadius;
      setRenderRadius(nextRadius);
    } else if (renderedRadiusRef.current !== targetRadius) {
      animatedRadiusRef.current = targetRadius;
      renderedRadiusRef.current = targetRadius;
      setRenderRadius(targetRadius);
    }

    if (groupRef.current) {
      if (!isInitialized.current) {
        // Initialize immediately to avoid flash
        groupRef.current.rotation.y = currentTarget;
        isInitialized.current = true;
      } else {
        // Smooth interpolation for rotation changes
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          currentTarget,
          delta * 5
        );
      }
    }
  });

  return {
    groupRef,
    getPosition,
    getRotation,
  };
}
