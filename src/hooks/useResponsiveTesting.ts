import { useState, useEffect } from 'react';

export type BreakpointType = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OrientationType = 'portrait' | 'landscape';

interface ResponsiveTestingState {
  currentBreakpoint: BreakpointType;
  deviceType: DeviceType;
  orientation: OrientationType;
  screenSize: {
    width: number;
    height: number;
  };
  isTouch: boolean;
  pixelRatio: number;
  colorScheme: 'light' | 'dark';
  reducedMotion: boolean;
}

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  deviceType: DeviceType;
  pixelRatio: number;
  userAgent?: string;
}

const DEVICE_PRESETS: Record<string, DevicePreset> = {
  'iphone-13': {
    name: 'iPhone 13',
    width: 390,
    height: 844,
    deviceType: 'mobile',
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'iphone-se': {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    deviceType: 'mobile',
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'ipad': {
    name: 'iPad',
    width: 768,
    height: 1024,
    deviceType: 'tablet',
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'ipad-pro': {
    name: 'iPad Pro',
    width: 1024,
    height: 1366,
    deviceType: 'tablet',
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'desktop-hd': {
    name: 'Desktop HD',
    width: 1920,
    height: 1080,
    deviceType: 'desktop',
    pixelRatio: 1
  },
  'desktop-4k': {
    name: 'Desktop 4K',
    width: 3840,
    height: 2160,
    deviceType: 'desktop',
    pixelRatio: 2
  }
};

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export const useResponsiveTesting = () => {
  const [state, setState] = useState<ResponsiveTestingState>({
    currentBreakpoint: 'xl',
    deviceType: 'desktop',
    orientation: 'landscape',
    screenSize: { width: 1920, height: 1080 },
    isTouch: false,
    pixelRatio: 1,
    colorScheme: 'light',
    reducedMotion: false
  });

  const [testingMode, setTestingMode] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    const updateState = () => {
      if (testingMode && activePreset) return; // Don't update if in testing mode

      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState(prev => ({
        ...prev,
        screenSize: { width, height },
        currentBreakpoint: getCurrentBreakpoint(width),
        deviceType: getDeviceType(width),
        orientation: width > height ? 'landscape' : 'portrait',
        isTouch: 'ontouchstart' in window,
        pixelRatio: window.devicePixelRatio || 1,
        colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }));
    };

    updateState();
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);

    // Listen for color scheme changes
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    colorSchemeQuery.addEventListener('change', updateState);

    // Listen for reduced motion changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
      colorSchemeQuery.removeEventListener('change', updateState);
      reducedMotionQuery.removeEventListener('change', updateState);
    };
  }, [testingMode, activePreset]);

  const getCurrentBreakpoint = (width: number): BreakpointType => {
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  };

  const getDeviceType = (width: number): DeviceType => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };

  const applyDevicePreset = (presetKey: string) => {
    const preset = DEVICE_PRESETS[presetKey];
    if (!preset) return;

    setActivePreset(presetKey);
    setTestingMode(true);

    setState(prev => ({
      ...prev,
      screenSize: { width: preset.width, height: preset.height },
      currentBreakpoint: getCurrentBreakpoint(preset.width),
      deviceType: preset.deviceType,
      orientation: preset.width > preset.height ? 'landscape' : 'portrait',
      pixelRatio: preset.pixelRatio,
      isTouch: preset.deviceType !== 'desktop'
    }));

    // Apply CSS viewport simulation
    const root = document.documentElement;
    root.style.setProperty('--viewport-width', `${preset.width}px`);
    root.style.setProperty('--viewport-height', `${preset.height}px`);
    root.style.setProperty('--pixel-ratio', preset.pixelRatio.toString());

    // Simulate user agent if provided
    if (preset.userAgent) {
      // Note: Changing user agent requires browser dev tools or extension
    }
  };

  const exitTestingMode = () => {
    setTestingMode(false);
    setActivePreset(null);

    // Reset CSS viewport
    const root = document.documentElement;
    root.style.removeProperty('--viewport-width');
    root.style.removeProperty('--viewport-height');
    root.style.removeProperty('--pixel-ratio');
  };

  const toggleOrientation = () => {
    if (!testingMode || !activePreset) return;

    const preset = DEVICE_PRESETS[activePreset];
    const newWidth = state.screenSize.height;
    const newHeight = state.screenSize.width;

    setState(prev => ({
      ...prev,
      screenSize: { width: newWidth, height: newHeight },
      orientation: newWidth > newHeight ? 'landscape' : 'portrait'
    }));

    // Update CSS viewport
    const root = document.documentElement;
    root.style.setProperty('--viewport-width', `${newWidth}px`);
    root.style.setProperty('--viewport-height', `${newHeight}px`);
  };

  const testResponsiveBreakpoints = () => {
    const results: Record<BreakpointType, boolean> = {} as any;
    
    Object.entries(BREAKPOINTS).forEach(([breakpoint, minWidth]) => {
      const query = window.matchMedia(`(min-width: ${minWidth}px)`);
      results[breakpoint as BreakpointType] = query.matches;
    });

    return results;
  };

  const getAccessibilityInfo = () => {
    return {
      reducedMotion: state.reducedMotion,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      darkMode: state.colorScheme === 'dark',
      touchSupport: state.isTouch,
      keyboardNavigation: !state.isTouch // Approximate
    };
  };

  const generateResponsiveReport = () => {
    const breakpointTests = testResponsiveBreakpoints();
    const accessibility = getAccessibilityInfo();

    return {
      device: {
        type: state.deviceType,
        preset: activePreset,
        testing: testingMode
      },
      screen: {
        size: state.screenSize,
        orientation: state.orientation,
        pixelRatio: state.pixelRatio,
        breakpoint: state.currentBreakpoint
      },
      breakpoints: breakpointTests,
      accessibility,
      timestamp: new Date().toISOString()
    };
  };

  return {
    ...state,
    testingMode,
    activePreset,
    devicePresets: DEVICE_PRESETS,
    applyDevicePreset,
    exitTestingMode,
    toggleOrientation,
    testResponsiveBreakpoints,
    getAccessibilityInfo,
    generateResponsiveReport,
    breakpoints: BREAKPOINTS
  };
};